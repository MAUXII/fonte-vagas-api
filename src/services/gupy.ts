import { gupySearchTermForArea } from "../lib/area-filter.js"
import { config, NIVEL_SEARCH_TERMS } from "../lib/config.js"
import { createCache } from "../lib/cache.js"
import { UF_NAMES } from "../lib/location.js"
import {
  formatLocal,
  inferNivelFromText,
  normalizeText,
  nivelSlugMatches,
} from "../lib/normalize.js"
import type { JobFilters, JobListing, NivelSlug } from "../types.js"

type GupyJob = {
  id: number
  name: string
  description?: string
  careerPageName?: string
  type?: string
  publishedDate?: string
  isRemoteWork?: boolean
  city?: string
  state?: string
  country?: string
  jobUrl?: string
  workplaceType?: string
  skills?: Array<{ name?: string }>
}

type GupyResponse = {
  data?: GupyJob[]
  pagination?: { total?: number; limit?: number; offset?: number }
}

const searchCache = createCache<GupyResponse>()

const GUPY_TYPE_LABEL: Record<string, string> = {
  vacancy_type_internship: "Estágio",
  vacancy_type_temporary: "Temporário",
  vacancy_type_contract: "Contrato",
  vacancy_type_apprentice: "Aprendiz",
}

function mapWorkplace(job: GupyJob): string | null {
  if (job.isRemoteWork || job.workplaceType === "remote") return "Remoto"
  if (job.workplaceType === "hybrid") return "Híbrido"
  if (job.workplaceType === "on-site") return "Presencial"
  return null
}

function mapContractType(type?: string): string | null {
  if (!type) return null
  return GUPY_TYPE_LABEL[type] ?? type.replace("vacancy_type_", "")
}

function mapNivel(job: GupyJob): string | null {
  if (job.type && GUPY_TYPE_LABEL[job.type]) {
    if (job.type === "vacancy_type_internship" || job.type === "vacancy_type_apprentice") {
      return GUPY_TYPE_LABEL[job.type]!
    }
  }
  return inferNivelFromText(job.name, job.description)
}

function stateToUf(state?: string): string | null {
  if (!state) return null
  if (state.length === 2) return state.toUpperCase()
  const n = normalizeText(state)
  for (const [uf, name] of Object.entries(UF_NAMES)) {
    if (n === name) return uf
  }
  return state
}

function normalizeGupyJob(job: GupyJob): JobListing {
  const br = !job.country || job.country.toLowerCase().includes("brasil")
  const estado = br ? stateToUf(job.state) : (job.state ?? null)
  const cidade = job.city ?? null
  const forma = mapWorkplace(job)

  return {
    id: `gupy:${job.id}`,
    fonte: "gupy",
    titulo: job.name,
    empresa: job.careerPageName ?? "N/A",
    nivel: mapNivel(job),
    tipo_contrato: mapContractType(job.type),
    forma_trabalho: forma,
    local: forma === "Remoto" ? "Remoto" : formatLocal(cidade, estado),
    cidade,
    estado,
    salario: null,
    link: job.jobUrl ?? "",
    plataforma: "Gupy",
    tecnologias: job.skills?.map((s) => s.name).filter((n): n is string => Boolean(n)) ?? [],
    descricao: job.description?.slice(0, 500) ?? null,
    publicado_em: job.publishedDate ?? null,
    slug: null,
  }
}

async function fetchGupySearch(jobName: string, offset: number, limit: number): Promise<GupyResponse> {
  const key = `${jobName}:${offset}:${limit}`
  const cached = searchCache.get(key)
  if (cached) return cached

  const url = new URL(`${config.gupyPortalBase}/jobs`)
  url.searchParams.set("jobName", jobName)
  url.searchParams.set("offset", String(offset))
  url.searchParams.set("limit", String(Math.min(limit, 50)))

  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) {
    throw new Error(`Gupy ${res.status}`)
  }

  const data = (await res.json()) as GupyResponse
  searchCache.set(key, data, config.cacheTtlMs)
  return data
}

function passesNivel(job: GupyJob, nivel: NivelSlug): boolean {
  const title = normalizeText(job.name)
  const blob = normalizeText(`${job.name} ${job.description ?? ""}`)

  if (nivel === "estagio") {
    const isInternshipType =
      job.type === "vacancy_type_internship" || job.type === "vacancy_type_apprentice"
    const titleSaysInternship = /\bestagi|\bintern\b|\baprendiz\b/.test(title)
    if (/\bsenior\b|\bsr\b|\bpleno\b|\bespecialista\b/.test(title)) return false
    if (isInternshipType || titleSaysInternship) return true
    return false
  }

  const mapped = mapNivel(job)
  if (!mapped) {
    const terms: Record<NivelSlug, string[]> = {
      estagio: ["estagio", "estagi", "intern", "aprendiz"],
      junior: ["junior", "jr"],
      pleno: ["pleno"],
      senior: ["senior", "sr", "especialista"],
    }
    return terms[nivel].some((t) => blob.includes(t))
  }
  return nivelSlugMatches(mapped, nivel)
}

function gupySearchTerms(params: JobFilters): string[] {
  const terms = new Set<string>()
  if (params.q?.trim()) terms.add(params.q.trim())

  const areaTerm = gupySearchTermForArea(params.area)
  const nivelTerm = NIVEL_SEARCH_TERMS[params.nivel] ?? params.nivel

  if (params.nivel === "estagio" && areaTerm) {
    terms.add(`estagio ${areaTerm}`)
    terms.add(areaTerm)
  } else if (areaTerm) {
    terms.add(areaTerm)
    terms.add(nivelTerm)
  } else {
    terms.add(nivelTerm)
  }

  return [...terms]
}

export async function searchGupy(params: JobFilters, fetchLimit: number): Promise<JobListing[]> {
  const terms = gupySearchTerms(params)
  const seen = new Set<number>()
  const out: JobListing[] = []

  for (const jobName of terms) {
    for (let offset = 0; offset < 200 && out.length < fetchLimit; offset += 50) {
      const response = await fetchGupySearch(jobName, offset, 50)
      const rows = response.data ?? []
      if (rows.length === 0) break

      for (const job of rows) {
        if (seen.has(job.id)) continue
        if (!passesNivel(job, params.nivel)) continue
        seen.add(job.id)
        out.push(normalizeGupyJob(job))
        if (out.length >= fetchLimit) break
      }
    }
    if (out.length >= fetchLimit) break
  }

  return out
}

export async function getGupyJob(id: string): Promise<JobListing | null> {
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) return null

  for (const term of ["desenvolvedor", "estagio", "tecnologia"]) {
    try {
      const res = await fetchGupySearch(term, 0, 50)
      const hit = res.data?.find((j) => j.id === numericId)
      if (hit) return normalizeGupyJob(hit)
    } catch {
      continue
    }
  }
  return null
}
