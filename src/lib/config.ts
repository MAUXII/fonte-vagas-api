import type { JobSource } from "../types.js"

const DEFAULT_GITHUB_REPOS = [
  "frontendbr/vagas",
  "backend-br/vagas",
  "react-brasil/vagas",
  "qa-brasil/vagas",
  "soujava/vagas-java",
  "dotnetdevbr/vagas",
  "androiddevbr/vagas",
]

/**
 * Empresas com vagas no Brasil em ATS com API pública de leitura.
 * Formato `provedor:slug`; o slug é o mesmo da URL pública do quadro de vagas.
 */
const DEFAULT_ATS_BOARDS = [
  "greenhouse:stone",
  "greenhouse:wildlifestudios",
  "greenhouse:ebanx",
  "greenhouse:vtex",
  "greenhouse:gympass",
  "greenhouse:c6bank",
  "greenhouse:xpinc",
  "greenhouse:quintoandar",
  "greenhouse:rdstation",
  "greenhouse:jusbrasil",
  "greenhouse:inter",
  "lever:ciandt",
  "lever:neon",
  "lever:swile",
  "ashby:nubank",
]

export const ALL_SOURCES: JobSource[] = [
  "meu-padrinho",
  "gupy",
  "github",
  "greenhouse",
  "lever",
  "ashby",
  "linkedin",
]

/** LinkedIn depende de um serviço de terceiros que costuma ficar fora do ar; fica opt-in. */
const DEFAULT_SOURCES: JobSource[] = ["meu-padrinho", "gupy", "github", "greenhouse", "lever", "ashby"]

export const config = {
  port: Number(process.env.PORT ?? 4010),
  cacheTtlMs: Number(process.env.CACHE_TTL ?? 300) * 1000,
  /** Sem token o GitHub permite 60 req/h; cache maior evita estourar o limite. */
  githubCacheTtlMs: Number(process.env.GITHUB_CACHE_TTL ?? 1800) * 1000,
  /** Detalhe de vaga do Meu Padrinho quase nunca muda; cache longo evita 429. */
  meuPadrinhoDetailTtlMs: Number(process.env.MEU_PADRINHO_DETAIL_TTL ?? 21600) * 1000,
  atsCacheTtlMs: Number(process.env.ATS_CACHE_TTL ?? 1800) * 1000,
  fetchConcurrency: Number(process.env.FETCH_CONCURRENCY ?? 2),
  meuPadrinhoBase: "https://meupadrinho.com.br/api",
  gupyPortalBase: "https://portal.gupy.io/api/job-search",
  githubApiBase: "https://api.github.com",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubRepos: csv(process.env.GITHUB_REPOS) ?? DEFAULT_GITHUB_REPOS,
  atsBoards: csv(process.env.ATS_BOARDS) ?? DEFAULT_ATS_BOARDS,
  vagasDevBase: process.env.VAGAS_DEV_API_URL ?? "https://vagas-api.henriquesebastiao.com",
  vagasDevEnabled: process.env.VAGAS_DEV_ENABLED !== "false",
  defaultFontes: parseFontes(process.env.DEFAULT_FONTES) ?? DEFAULT_SOURCES,
}

function csv(raw: string | undefined): string[] | undefined {
  const items = raw?.split(",").map((s) => s.trim()).filter(Boolean)
  return items && items.length > 0 ? items : undefined
}

export function parseFontes(raw: string | undefined): JobSource[] | undefined {
  const valid = new Set<string>(ALL_SOURCES)
  const parsed = csv(raw)?.filter((s): s is JobSource => valid.has(s))
  return parsed && parsed.length > 0 ? parsed : undefined
}

export const NIVEL_SEARCH_TERMS: Record<string, string> = {
  estagio: "estagio",
  junior: "junior",
  pleno: "pleno",
  senior: "senior",
}
