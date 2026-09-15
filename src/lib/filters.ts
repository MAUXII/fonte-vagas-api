import type { JobFilters, JobListing } from "../types.js"
import { matchesCity, matchesState } from "./location.js"
import { matchesFilter, normalizeText } from "./normalize.js"

export function applyJobFilters(jobs: JobListing[], filters: JobFilters): JobListing[] {
  return jobs.filter((job) => {
    if (!matchesFilter(job.tipo_contrato, filters.tipo_contrato)) return false
    if (!matchesFilter(job.forma_trabalho, filters.forma_trabalho)) return false
    if (!matchesState(job.estado, job.cidade, job.local, filters.estado)) return false
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
