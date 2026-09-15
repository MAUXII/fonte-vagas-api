import { config } from "../lib/config.js"
import { applyJobFilters, dedupeJobs, sortJobsByDate } from "../lib/filters.js"
import { parseJobId } from "../lib/normalize.js"
import type { JobFilters, JobListing, JobSource, JobsListResponse, SourceFetchResult } from "../types.js"
import { getGupyJob, searchGupy } from "./gupy.js"
import { getGithubJob, searchGithubIssues } from "./github-issues.js"
import { getMeuPadrinhoJob, searchMeuPadrinho } from "./meu-padrinho.js"

const ADAPTERS: Record<
  JobSource,
  { search: (p: JobFilters, limit: number) => Promise<JobListing[]>; get?: (id: string) => Promise<JobListing | null> }
> = {
  "meu-padrinho": { search: searchMeuPadrinho, get: getMeuPadrinhoJob },
  gupy: { search: searchGupy, get: getGupyJob },
  github: { search: searchGithubIssues, get: getGithubJob },
}

export function parseFontesQuery(raw?: string): JobSource[] {
  if (!raw?.trim()) return config.defaultFontes
  const valid = new Set<JobSource>(["meu-padrinho", "gupy", "github"])
  const parsed = raw
    .split(",")
    .map((s) => s.trim() as JobSource)
    .filter((s) => valid.has(s))
  return parsed.length > 0 ? parsed : config.defaultFontes
}

async function fetchFromSource(fonte: JobSource, params: JobFilters, fetchLimit: number): Promise<SourceFetchResult> {
  try {
    const vagas = await ADAPTERS[fonte].search(params, fetchLimit)
    return { fonte, vagas }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido"
    console.error(`[${fonte}]`, msg)
    return { fonte, vagas: [], erro: msg }
  }
}

export async function searchAllJobs(params: JobFilters): Promise<JobsListResponse> {
  const fontes = params.fontes ?? config.defaultFontes
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50)
  const page = Math.max(params.page ?? 0, 0)

  // Busca mais profunda para agregar, filtrar e paginar depois
  const fetchLimit = Math.min(50, limit * (page + 2))

  const batches = await Promise.all(fontes.map((f) => fetchFromSource(f, params, fetchLimit)))

  let merged: JobListing[] = []
  const por_fonte: Record<string, number> = {}
  const avisos: string[] = []

  for (const batch of batches) {
    por_fonte[batch.fonte] = batch.vagas.length
    if (batch.erro) avisos.push(`${batch.fonte}: ${batch.erro}`)
    merged.push(...batch.vagas)
  }

  merged = dedupeJobs(merged)
  merged = applyJobFilters(merged, params)
  merged = sortJobsByDate(merged)

  const total = merged.length
  const start = page * limit
  const vagas = merged.slice(start, start + limit)

  return {
    total,
    page,
    limit,
    filtros: {
      nivel: params.nivel,
      fontes,
      tipo_contrato: params.tipo_contrato,
      forma_trabalho: params.forma_trabalho,
      estado: params.estado,
      cidade: params.cidade,
      local: params.local,
      q: params.q,
    },
    fontes_consultadas: fontes,
    por_fonte,
    avisos,
    vagas,
  }
}

export async function getJobById(rawId: string): Promise<JobListing | null> {
  const parsed = parseJobId(rawId)
  if (!parsed) {
    // compat: ids antigos Meu Padrinho sem prefixo
    return getMeuPadrinhoJob(rawId)
  }

  const adapter = ADAPTERS[parsed.fonte]
  if (!adapter.get) return null
  return adapter.get(parsed.id)
}

export function listFontes() {
  return {
    fontes: [
      {
        id: "meu-padrinho",
        nome: "Meu Padrinho",
        descricao: "Curadoria IA — LinkedIn e outras plataformas",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho"],
      },
      {
        id: "gupy",
        nome: "Gupy Portal",
        descricao: "Portal público employability-portal.gupy.io",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "q"],
      },
      {
        id: "github",
        nome: "GitHub Issues",
        descricao: `Repositórios comunitários: ${config.githubRepos.join(", ")}`,
        filtros: ["nivel", "estado", "cidade", "forma_trabalho"],
      },
    ],
    default: config.defaultFontes,
  }
}
