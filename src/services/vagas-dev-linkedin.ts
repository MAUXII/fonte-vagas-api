import { config } from "../lib/config.js"
import { createCache } from "../lib/cache.js"
import { BR_STATE_NAMES } from "../lib/br-states.js"
import { parseBrazilLocation } from "../lib/location.js"
import { normalizeText } from "../lib/normalize.js"
import type { AreaSlug } from "../lib/area-filter.js"
import type { JobFilters, JobListing } from "../types.js"

/** Resposta do projeto open source https://github.com/henriquesebastiao/vagas-dev */
type VagasDevJob = {
  id: number
  external_id: string
  keyword: string
  source: "linkedin" | "gupy"
  title: string
  company: string | null
  location: string | null
  url: string
  description: string | null
  workplace_type: "remote" | "hybrid" | "on-site" | null
  level: "junior" | "pleno" | "senior" | "estagio" | "trainee" | null
  for_pcd: boolean
  found_at: string
}

const listCache = createCache<VagasDevJob[]>()

const KEYWORDS_BY_AREA: Record<Exclude<AreaSlug, "qualquer" | "administracao">, string[]> = {
  tecnologia: ["backend", "frontend", "javascript", "python", "java", "react"],
  design: ["frontend"],
  dados: ["python", "backend"],
}

function mapWorkplace(type: VagasDevJob["workplace_type"]): string | null {
  if (type === "remote") return "Remoto"
  if (type === "hybrid") return "Híbrido"
  if (type === "on-site") return "Presencial"
  return null
}

function mapNivelLabel(level: VagasDevJob["level"]): string | null {
  if (!level) return null
  const map: Record<string, string> = {
    estagio: "Estágio",
    trainee: "Trainee",
    junior: "Júnior",
    pleno: "Pleno",
    senior: "Sênior",
  }
  return map[level] ?? level
}

function buildLocation(params: JobFilters): string | undefined {
  if (params.cidade?.trim()) return params.cidade.trim()
  if (params.estado?.trim()) {
    const uf = params.estado.toUpperCase()
    return BR_STATE_NAMES[uf] ?? params.estado
  }
  return undefined
}

function mapFormaToWorkplace(forma?: string): VagasDevJob["workplace_type"] | undefined {
  if (!forma) return undefined
  const n = normalizeText(forma)
  if (n.includes("remoto")) return "remote"
  if (n.includes("hibrido")) return "hybrid"
  if (n.includes("presencial")) return "on-site"
  return undefined
}

function keywordsFor(params: JobFilters): string[] {
  if (params.q?.trim()) {
    const q = normalizeText(params.q.trim())
    const allowed = new Set([
      "python",
      "fastapi",
      "django",
      "flask",
      "java",
      "spring",
      "golang",
      "javascript",
      "react",
      "angular",
      "vue",
      "frontend",
      "backend",
    ])
    for (const k of allowed) {
      if (q.includes(k)) return [k]
    }
  }

  const area = params.area ?? "tecnologia"
  if (area === "qualquer" || area === "administracao") {
    return ["backend", "frontend"]
  }
  return KEYWORDS_BY_AREA[area]
}

async function fetchVagasDev(params: URLSearchParams): Promise<VagasDevJob[]> {
  const key = params.toString()
  const cached = listCache.get(key)
  if (cached) return cached

  const url = `${config.vagasDevBase.replace(/\/$/, "")}/jobs?${params}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) {
    throw new Error(`vagas-dev ${res.status}`)
  }

  const data = (await res.json()) as VagasDevJob[]
  listCache.set(key, data, config.cacheTtlMs)
  return data
}

function normalizeLinkedinJob(job: VagasDevJob): JobListing {
  const loc = parseBrazilLocation(job.location)
  const forma = mapWorkplace(job.workplace_type)

  return {
    id: `li:${job.external_id}`,
    fonte: "linkedin",
    titulo: job.title,
    empresa: job.company ?? "N/A",
    nivel: mapNivelLabel(job.level),
    tipo_contrato: job.level === "estagio" ? "Estágio" : null,
    forma_trabalho: forma,
    local: loc.local ?? job.location,
    cidade: loc.cidade,
    estado: loc.estado,
    salario: null,
    link: job.url,
    plataforma: "LinkedIn",
    tecnologias: job.keyword ? [job.keyword] : [],
    descricao: job.description?.slice(0, 500) ?? null,
    publicado_em: job.found_at,
    slug: String(job.id),
  }
}

export async function searchVagasDevLinkedin(
  params: JobFilters,
  fetchLimit: number,
): Promise<JobListing[]> {
  if (!config.vagasDevEnabled) return []

  const keywords = keywordsFor(params)
  const location = buildLocation(params)
  const workplace = mapFormaToWorkplace(params.forma_trabalho)
  const seen = new Set<string>()
  const out: JobListing[] = []

  for (const keyword of keywords) {
    const sp = new URLSearchParams()
    sp.set("source", "linkedin")
    sp.set("keyword", keyword)
    sp.set("level", params.nivel)
    sp.set("limit", String(Math.min(50, fetchLimit)))
    if (location) sp.set("location", location)
    if (workplace) sp.set("workplace_type", workplace)

    const rows = await fetchVagasDev(sp)
    for (const row of rows) {
      if (row.source !== "linkedin") continue
      if (seen.has(row.external_id)) continue
      seen.add(row.external_id)
      out.push(normalizeLinkedinJob(row))
      if (out.length >= fetchLimit) break
    }
    if (out.length >= fetchLimit) break
  }

  return out
}

export async function getVagasDevLinkedinJob(externalId: string): Promise<JobListing | null> {
  if (!config.vagasDevEnabled) return null
  try {
    const sp = new URLSearchParams({ source: "linkedin", limit: "200" })
    const rows = await fetchVagasDev(sp)
    const hit = rows.find((r) => r.external_id === externalId)
    return hit ? normalizeLinkedinJob(hit) : null
  } catch {
    return null
  }
}
