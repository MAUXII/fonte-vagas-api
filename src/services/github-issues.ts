import { config } from "../lib/config.js"
import { createCache } from "../lib/cache.js"
import { parseBrazilLocation } from "../lib/location.js"
import {
  inferNivelFromText,
  normalizeText,
  nivelSlugMatches,
} from "../lib/normalize.js"
import type { JobFilters, JobListing } from "../types.js"

type GhIssue = {
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  labels?: Array<{ name: string }>
}

type GhSearchResult = {
  repo: string
  issues: GhIssue[]
}

const issuesCache = createCache<GhIssue[]>()

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "fonte-vagas-api",
  }
  if (config.githubToken) {
    h.Authorization = `Bearer ${config.githubToken}`
  }
  return h
}

async function fetchRepoIssues(repo: string, perPage: number): Promise<GhIssue[]> {
  const key = `${repo}:${perPage}`
  const cached = issuesCache.get(key)
  if (cached) return cached

  const url = `${config.githubApiBase}/repos/${repo}/issues?state=open&per_page=${perPage}&sort=created&direction=desc`
  const res = await fetch(url, { headers: ghHeaders() })
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} em ${repo}`)
  }

  const raw = (await res.json()) as Array<GhIssue & { pull_request?: unknown }>
  const issues = raw.filter((i) => !i.pull_request)
  issuesCache.set(key, issues, config.cacheTtlMs)
  return issues
}

function parseTitle(title: string): {
  locationRaw: string | null
  titulo: string
  empresa: string | null
} {
  const bracket = title.match(/^\[([^\]]+)\]\s*(.+)$/)
  if (!bracket) {
    const dash = title.match(/^(.+?)\s[-–—]\s(.+)$/)
    if (dash) return { locationRaw: null, titulo: dash[1]!.trim(), empresa: dash[2]!.trim() }
    return { locationRaw: null, titulo: title.trim(), empresa: null }
  }

  const locationRaw = bracket[1]!.trim()
  const rest = bracket[2]!.trim()
  const dash = rest.match(/^(.+?)\s[-–—]\s(.+)$/)
  if (dash) {
    return { locationRaw, titulo: dash[1]!.trim(), empresa: dash[2]!.trim() }
  }
  return { locationRaw, titulo: rest, empresa: null }
}

function extractApplyLink(body: string | null, htmlUrl: string): string {
  if (!body) return htmlUrl
  const urls = body.match(/https?:\/\/[^\s)\]>]+/g) ?? []
  const preferred = urls.find(
    (u) =>
      u.includes("gupy.io") ||
      u.includes("linkedin.com") ||
      u.includes("greenhouse.io") ||
      u.includes("lever.co") ||
      u.includes("ashbyhq.com"),
  )
  return preferred ?? urls[0] ?? htmlUrl
}

function labelsToForma(labels: string[]): string | null {
  const n = labels.map((l) => normalizeText(l))
  if (n.some((l) => l.includes("remoto"))) return "Remoto"
  if (n.some((l) => l.includes("hibrido"))) return "Híbrido"
  if (n.some((l) => l.includes("presencial"))) return "Presencial"
  return null
}

function labelsToNivel(labels: string[]): string | null {
  for (const label of labels) {
    const l = normalizeText(label)
    if (l.includes("estagio")) return "Estágio"
    if (l.includes("junior") || l === "jr") return "Júnior"
    if (l.includes("pleno")) return "Pleno"
    if (l.includes("senior") || l.includes("especialista")) return "Sênior"
  }
  return null
}

function labelsToContract(labels: string[]): string | null {
  for (const label of labels) {
    const l = normalizeText(label)
    if (l === "pj") return "PJ"
    if (l === "clt") return "CLT"
    if (l.includes("estagio")) return "Estágio"
  }
  return null
}

function parseLocationFromBracket(locationRaw: string | null): ReturnType<typeof parseBrazilLocation> {
  if (!locationRaw) return parseBrazilLocation(null)

  const lower = normalizeText(locationRaw)
  if (lower.includes("remoto")) {
    return { cidade: null, estado: null, local: "Remoto" }
  }

  if (locationRaw.includes("/")) {
    const [left, right] = locationRaw.split("/")
    return parseBrazilLocation(`${left?.trim()}, ${right?.trim()}`)
  }

  if (locationRaw.includes("-") && !locationRaw.includes(",")) {
    const parts = locationRaw.split("-").map((p) => p.trim())
    if (parts.length === 2 && parts[1]!.length <= 3) {
      return parseBrazilLocation(`${parts[0]}, ${parts[1]}`)
    }
  }

  return parseBrazilLocation(locationRaw)
}

function normalizeGithubIssue(issue: GhIssue, repo: string): JobListing {
  const parsed = parseTitle(issue.title)
  const labelNames = issue.labels?.map((l) => l.name) ?? []
  const loc = parseLocationFromBracket(parsed.locationRaw)
  const forma = labelsToForma(labelNames) ?? (loc.local === "Remoto" ? "Remoto" : null)
  const nivel =
    labelsToNivel(labelNames) ??
    inferNivelFromText(parsed.titulo, issue.body?.slice(0, 300))

  const ghId = `${repo.replace("/", "-")}-${issue.number}`

  return {
    id: `gh:${ghId}`,
    fonte: "github",
    titulo: parsed.titulo,
    empresa: parsed.empresa ?? repo.split("/")[0] ?? "—",
    nivel,
    tipo_contrato: labelsToContract(labelNames),
    forma_trabalho: forma,
    local: loc.local ?? parsed.locationRaw,
    cidade: loc.cidade,
    estado: loc.estado,
    salario: null,
    link: extractApplyLink(issue.body, issue.html_url),
    plataforma: "GitHub",
    tecnologias: labelNames.filter((l) =>
      /^(react|node|python|java|go|typescript|javascript|\.net|php|ruby|rust)$/i.test(l),
    ),
    descricao: issue.body?.slice(0, 400) ?? null,
    publicado_em: issue.created_at,
    slug: `${repo}#${issue.number}`,
  }
}

function matchesGithubNivel(job: JobListing, nivel: JobFilters["nivel"]): boolean {
  const detected = job.nivel ?? inferNivelFromText(job.titulo, job.descricao)
  if (!detected) return nivel === "estagio" || nivel === "junior"
  return nivelSlugMatches(detected, nivel)
}

export async function searchGithubIssues(params: JobFilters, fetchLimit: number): Promise<JobListing[]> {
  const perRepo = Math.max(5, Math.ceil(fetchLimit / config.githubRepos.length))

  const batches = await Promise.allSettled(
    config.githubRepos.map(async (repo) => {
      const issues = await fetchRepoIssues(repo, Math.min(perRepo, 30))
      return { repo, issues }
    }),
  )

  const merged: JobListing[] = []

  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue
    const { repo, issues } = batch.value
    for (const issue of issues) {
      const job = normalizeGithubIssue(issue, repo)
      if (!matchesGithubNivel(job, params.nivel)) continue
      merged.push(job)
    }
  }

  return merged.slice(0, fetchLimit)
}

export async function getGithubJob(rawId: string): Promise<JobListing | null> {
  const m = rawId.match(/^(.+)-(\d+)$/)
  if (!m) return null

  const repoSlug = m[1]!
  const number = Number(m[2])
  const resolvedRepo = config.githubRepos.find((r) => r.replace("/", "-") === repoSlug)
  if (!resolvedRepo) return null

  const url = `${config.githubApiBase}/repos/${resolvedRepo}/issues/${number}`
  const res = await fetch(url, { headers: ghHeaders() })
  if (!res.ok) return null

  const issue = (await res.json()) as GhIssue & { pull_request?: unknown }
  if (issue.pull_request) return null
  return normalizeGithubIssue(issue, resolvedRepo)
}
