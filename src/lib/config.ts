import type { JobSource } from "../types.js"

const DEFAULT_GITHUB_REPOS = [
  "frontendbr/vagas",
  "backend-br/vagas",
  "react-brasil/vagas",
  "python-brasil/vagas",
  "qa-brasil/vagas",
]

export const config = {
  port: Number(process.env.PORT ?? 4010),
  cacheTtlMs: Number(process.env.CACHE_TTL ?? 300) * 1000,
  fetchConcurrency: Number(process.env.FETCH_CONCURRENCY ?? 4),
  meuPadrinhoBase: "https://meupadrinho.com.br/api",
  gupyPortalBase: "https://employability-portal.gupy.io/api/v1",
  githubApiBase: "https://api.github.com",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubRepos: (process.env.GITHUB_REPOS?.split(",").map((s) => s.trim()).filter(Boolean) ??
    DEFAULT_GITHUB_REPOS) as string[],
  defaultFontes: parseFontes(process.env.DEFAULT_FONTES ?? "meu-padrinho,gupy,github"),
}

function parseFontes(raw: string): JobSource[] {
  const valid = new Set<JobSource>(["meu-padrinho", "gupy", "github"])
  const parsed = raw
    .split(",")
    .map((s) => s.trim() as JobSource)
    .filter((s) => valid.has(s))
  return parsed.length > 0 ? parsed : ["meu-padrinho", "gupy", "github"]
}

export const NIVEL_SEARCH_TERMS: Record<string, string> = {
  estagio: "estagio",
  junior: "junior",
  pleno: "pleno",
  senior: "senior",
}
