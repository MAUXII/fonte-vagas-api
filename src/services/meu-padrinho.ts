import { config } from "../lib/config.js"
import { createCache } from "../lib/cache.js"
import { matchesFilter, normalizeJob, normalizeText } from "../lib/normalize.js"
import type { JobListing } from "../types.js"

type ListResponse = {
  vagas?: Array<{
    nano_id: string
    titulo_vaga?: string
    nome_empresa?: string
    nivel?: string
  }>
}

const listCache = createCache<ListResponse>()

async function mpGet<T>(path: string): Promise<T> {
  const res = await fetch(`${config.meuPadrinhoBase}${path}`, {
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Meu Padrinho ${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

async function fetchList(nivel: string, page: number): Promise<ListResponse> {
  const key = `${nivel}:${page}`
  const cached = listCache.get(key)
  if (cached) return cached

  const data = await mpGet<ListResponse>(`/vagas?niveis=${encodeURIComponent(nivel)}&page=${page}`)
  listCache.set(key, data, config.cacheTtlMs)
  return data
}

async function fetchDetail(nanoId: string) {
  const [detail, tech] = await Promise.all([
    mpGet<Record<string, string | null>>(`/vagas/${nanoId}`),
    mpGet<{ tecnologias?: Array<{ nome?: string }> }>(`/vagas/${nanoId}/tecnologias`).catch(
      () => ({ tecnologias: [] }),
    ),
  ])
  const tecnologias =
    tech.tecnologias?.map((t) => t.nome).filter((n): n is string => Boolean(n)) ?? []
  return { detail, tecnologias }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return out
}

export type SearchParams = {
  nivel: string
  page?: number
  limit?: number
  tipo_contrato?: string
  forma_trabalho?: string
  local?: string
}

export async function searchJobs(params: SearchParams): Promise<JobListing[]> {
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50)
  const page = Math.max(params.page ?? 0, 0)
  const targetNivel = normalizeText(params.nivel)

  const list = await fetchList(params.nivel, page)
  const items = list.vagas ?? []

  const candidates = items.filter((v) => !v.nivel || normalizeText(v.nivel) === targetNivel)

  const detailed = await mapPool(candidates, config.fetchConcurrency, async (item) => {
    const { detail, tecnologias } = await fetchDetail(item.nano_id)
    return normalizeJob(item, detail, tecnologias)
  })

  return detailed
    .filter((job) => {
      if (!matchesFilter(job.tipo_contrato, params.tipo_contrato)) return false
      if (!matchesFilter(job.forma_trabalho, params.forma_trabalho)) return false
      if (!matchesFilter(job.local, params.local)) return false
      return Boolean(job.link)
    })
    .slice(0, limit)
}

export async function getJobById(nanoId: string): Promise<JobListing | null> {
  try {
    const { detail, tecnologias } = await fetchDetail(nanoId)
    return normalizeJob({ nano_id: nanoId }, detail, tecnologias)
  } catch {
    return null
  }
}
