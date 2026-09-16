import type { JobFilters, JobListing, NivelSlug } from "../types.js"
import { matchesArea } from "./area-filter.js"
import { isRemoteJob, matchesCity, matchesState } from "./location.js"
import { inferNivelFromText, matchesFilter, normalizeText, nivelSlugMatches } from "./normalize.js"

function matchesNivel(job: JobListing, nivel: NivelSlug): boolean {
  const title = normalizeText(job.titulo ?? "")
  const detected = job.nivel ?? inferNivelFromText(job.titulo, job.descricao)

  if (nivel === "estagio") {
    if (/\bsenior\b|\bsr\b|\bpleno\b|\bespecialista\b/.test(title)) return false
    const titleInternship = /\bestagi|\bintern\b|\baprendiz\b/.test(title)
    const contractInternship =
      normalizeText(job.tipo_contrato ?? "").includes("estagio") ||
      normalizeText(job.tipo_contrato ?? "").includes("aprendiz")
    if (titleInternship || contractInternship) return true
    if (detected && nivelSlugMatches(detected, nivel)) return true
    return false
  }

  if (!detected) return false
  return nivelSlugMatches(detected, nivel)
}

export function applyJobFilters(jobs: JobListing[], filters: JobFilters): JobListing[] {
  return jobs.filter((job) => {
    if (!matchesNivel(job, filters.nivel)) return false
    if (!matchesArea(job, filters.area)) return false
    if (!matchesFilter(job.tipo_contrato, filters.tipo_contrato)) return false
    if (!matchesFilter(job.forma_trabalho, filters.forma_trabalho)) return false

    if (filters.estado && !matchesState(job.estado, job.cidade, job.local, filters.estado)) {
      const remote = isRemoteJob(job.local, job.forma_trabalho)
      const wantsPresencial = normalizeText(filters.forma_trabalho ?? "").includes("presencial")
      if (!(remote && !wantsPresencial)) return false
    }

    if (!matchesCity(job.cidade, job.local, filters.cidade)) return false

    if (filters.local) {
      const blob = normalizeText(
        [job.local, job.cidade, job.estado, job.titulo, job.empresa].filter(Boolean).join(" "),
      )
      if (!blob.includes(normalizeText(filters.local))) return false
    }

    if (filters.q) {
      const blob = normalizeText(
        [job.titulo, job.empresa, job.descricao, ...job.tecnologias].filter(Boolean).join(" "),
      )
      if (!blob.includes(normalizeText(filters.q))) return false
    }

    if (!job.link) return false
    return true
  })
}

export function dedupeJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>()
  const out: JobListing[] = []

  for (const job of jobs) {
    const key = normalizeText(job.link.replace(/\?.*$/, ""))
    if (seen.has(key)) continue
    seen.add(key)
    out.push(job)
  }

  return out
}

export function sortJobsByDate(jobs: JobListing[]): JobListing[] {
  return [...jobs].sort((a, b) => {
    const da = a.publicado_em ? Date.parse(a.publicado_em) : 0
    const db = b.publicado_em ? Date.parse(b.publicado_em) : 0
    return db - da
  })
}
