import { config } from "../lib/config.js"
import { createCache } from "../lib/cache.js"
import { normalizeMeuPadrinhoJob, normalizeText, nivelSlugMatches } from "../lib/normalize.js"
import { mapPool } from "../lib/pool.js"
import type { JobFilters, JobListing } from "../types.js"

type ListResponse = {
  vagas?: Array<{
    nano_id: string
    titulo_vaga?: string
    nome_empresa?: string
    nivel?: string
  }>
}

const listCache = createCache<ListResponse>()

type Detail = { detail: Record<string, string | null>; tecnologias: string[] }
const detailCache = createCache<Detail>()

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

async function fetchDetail(nanoId: string): Promise<Detail> {
  const cached = detailCache.get(nanoId)
  if (cached) return cached

  const [detail, tech] = await Promise.all([
    mpGet<Record<string, string | null>>(`/vagas/${nanoId}`),
    mpGet<{ tecnologias?: Array<{ nome?: string }> }>(`/vagas/${nanoId}/tecnologias`).catch(
      () => ({ tecnologias: [] }),
    ),
  ])
  const tecnologias =
    tech.tecnologias?.map((t) => t.nome).filter((n): n is string => Boolean(n)) ?? []
  const result = { detail, tecnologias }
  detailCache.set(nanoId, result, config.meuPadrinhoDetailTtlMs)
  return result
}

export async function searchMeuPadrinho(params: JobFilters, fetchLimit: number): Promise<JobListing[]> {
  const page = Math.max(params.page ?? 0, 0)
  const targetNivel = normalizeText(params.nivel)

  const list = await fetchList(params.nivel, page)
  const items = list.vagas ?? []

  const candidates = items
    .filter((v) => !v.nivel || normalizeText(v.nivel) === targetNivel || nivelSlugMatches(v.nivel, params.nivel))
    .slice(0, fetchLimit)

  // uma vaga com 429 não derruba a fonte inteira; as outras seguem
  const detailed = await mapPool(candidates, config.fetchConcurrency, async (item) => {
    try {
      const { detail, tecnologias } = await fetchDetail(item.nano_id)
      return normalizeMeuPadrinhoJob(item, detail, tecnologias)
    } catch {
      return null
    }
  })

  const ok = detailed.filter((j): j is JobListing => j !== null)
  if (ok.length === 0 && candidates.length > 0) {
    throw new Error("Meu Padrinho: detalhes indisponíveis (rate limit)")
  }
  return ok
}

export async function getMeuPadrinhoJob(nanoId: string): Promise<JobListing | null> {
  try {
    const { detail, tecnologias } = await fetchDetail(nanoId)
    return normalizeMeuPadrinhoJob({ nano_id: nanoId }, detail, tecnologias)
  } catch {
    return null
  }
}
