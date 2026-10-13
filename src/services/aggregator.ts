import { config, parseFontes } from "../lib/config.js"
import { applyJobFilters, dedupeJobs, sortJobsByDate } from "../lib/filters.js"
import { parseJobId } from "../lib/normalize.js"
import type { JobFilters, JobListing, JobSource, JobsListResponse, SourceFetchResult } from "../types.js"
import { atsGet, atsSearch } from "./ats.js"
import { getGupyJob, searchGupy } from "./gupy.js"
import { getGithubJob, searchGithubIssues } from "./github-issues.js"
import { getMeuPadrinhoJob, searchMeuPadrinho } from "./meu-padrinho.js"
import { getVagasDevLinkedinJob, searchVagasDevLinkedin } from "./vagas-dev-linkedin.js"

const ADAPTERS: Record<
  JobSource,
  { search: (p: JobFilters, limit: number) => Promise<JobListing[]>; get?: (id: string) => Promise<JobListing | null> }
> = {
  "meu-padrinho": { search: searchMeuPadrinho, get: getMeuPadrinhoJob },
  gupy: { search: searchGupy, get: getGupyJob },
  github: { search: searchGithubIssues, get: getGithubJob },
  greenhouse: { search: atsSearch("greenhouse"), get: atsGet("greenhouse") },
  lever: { search: atsSearch("lever"), get: atsGet("lever") },
  ashby: { search: atsSearch("ashby"), get: atsGet("ashby") },
  linkedin: { search: searchVagasDevLinkedin, get: getVagasDevLinkedinJob },
}

export function parseFontesQuery(raw?: string): JobSource[] {
  return parseFontes(raw) ?? config.defaultFontes
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

  // Busca profunda: filtros de área/estado eliminam muita coisa depois
  const hasStrictFilters = Boolean(
    (params.area && params.area !== "qualquer") ||
      params.estado ||
      params.cidade ||
      params.forma_trabalho,
  )
  const fetchLimit = hasStrictFilters ? 50 : Math.min(50, limit * (page + 2))

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

  const por_fonte_filtrado: Record<string, number> = {}
  for (const job of merged) {
    por_fonte_filtrado[job.fonte] = (por_fonte_filtrado[job.fonte] ?? 0) + 1
  }

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
      area: params.area,
    },
    fontes_consultadas: fontes,
    por_fonte,
    por_fonte_filtrado,
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
        descricao: "Curadoria com nivel explicito (meupadrinho.com.br)",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho"],
      },
      {
        id: "gupy",
        nome: "Gupy Portal",
        descricao: "Portal público portal.gupy.io",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "q"],
      },
      {
        id: "github",
        nome: "GitHub Issues",
        descricao: `Repositórios comunitários: ${config.githubRepos.join(", ")}`,
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "area"],
      },
      {
        id: "greenhouse",
        nome: "Greenhouse",
        descricao: "Quadros publicos de empresas com vagas no Brasil (ATS_BOARDS)",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "area"],
      },
      {
        id: "lever",
        nome: "Lever",
        descricao: "Quadros publicos de empresas com vagas no Brasil (ATS_BOARDS)",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "area"],
      },
      {
        id: "ashby",
        nome: "Ashby",
        descricao: "Quadros publicos de empresas com vagas no Brasil (ATS_BOARDS)",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "area"],
      },
      {
        id: "linkedin",
        nome: "LinkedIn",
        descricao: "LinkedIn via scraper open source vagas-dev (API publica de terceiros)",
        filtros: ["nivel", "estado", "cidade", "forma_trabalho", "area"],
      },
    ],
    default: config.defaultFontes,
  }
}
