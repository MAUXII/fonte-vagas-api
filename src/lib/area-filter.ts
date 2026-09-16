import type { JobListing } from "../types.js"
import { normalizeText } from "./normalize.js"

export type AreaSlug = "tecnologia" | "design" | "dados" | "administracao" | "qualquer"

const TECH_POSITIVE = [
  "desenvolvedor",
  "developer",
  "software",
  "programador",
  "programacao",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "fullstack",
  "full stack",
  "full-stack",
  "desenvolvimento de sistemas",
  "desenvolvimento de software",
  "engenharia de software",
  "analista de sistemas",
  "analista de ti",
  "suporte tecnico",
  "devops",
  "sre",
  "cyber",
  "seguranca da informacao",
  "mobile",
  " react",
  " node",
  " python",
  " java",
  " javascript",
  " typescript",
  " angular",
  " vue",
  " kotlin",
  " golang",
  " c#",
  ".net",
  "quality assurance",
  "testes automatizados",
  "automation engineer",
  "engenheiro de software",
  "estagiario de ti",
  "tecnologia da informacao",
]

const TECH_NEGATIVE = [
  "desenvolvimento organizacional",
  "desenvolvimento humano",
  "desenvolvimento imobiliario",
  "desenvolvimento de pessoas",
  "desenvolvimento de liderancas",
  "educacao corporativa",
  "recursos humanos",
  "pesquisa e desenvolvimento",
  "gestao de pessoas",
  "people ",
  "marketing",
  "comercial",
  "vendas",
  "financeiro",
  "contabil",
  "juridico",
  "advogado",
  "hunting",
]

const DESIGN_POSITIVE = [
  "design",
  "designer",
  "ux",
  "ui ",
  " ui/",
  "product design",
  "experiencia do usuario",
  "figma",
]

const DADOS_POSITIVE = [
  "dados",
  "data ",
  "analytics",
  "analitico",
  "bi ",
  "business intelligence",
  "cientista de dados",
  "engenheiro de dados",
  "data engineer",
  "machine learning",
  "inteligencia artificial",
  "sql",
  "power bi",
  "tableau",
]

const ADMIN_POSITIVE = [
  "administrativ",
  "assistente administrativo",
  "backoffice",
  "escritorio",
  "secretari",
  "recepcion",
  "auxiliar administrativo",
]

function jobBlob(job: JobListing): string {
  return normalizeText(
    [job.titulo, job.empresa, job.descricao, ...job.tecnologias].filter(Boolean).join(" "),
  )
}

function hasAny(blob: string, terms: string[]): boolean {
  return terms.some((t) => blob.includes(normalizeText(t)))
}

function matchesTecnologia(job: JobListing, blob: string, title: string): boolean {
  if (job.fonte === "github") return true
  if (job.tecnologias.length > 0) return true

  if (hasAny(blob, TECH_NEGATIVE) && !hasAny(title, TECH_POSITIVE)) {
    return false
  }

  return hasAny(blob, TECH_POSITIVE)
}

export function gupySearchTermForArea(area?: AreaSlug): string | undefined {
  switch (area) {
    case "tecnologia":
      return "desenvolvedor"
    case "design":
      return "design"
    case "dados":
      return "dados"
    case "administracao":
      return "administrativo"
    default:
      return undefined
  }
}

export function matchesArea(job: JobListing, area?: AreaSlug): boolean {
  if (!area || area === "qualquer") return true

  const blob = jobBlob(job)
  const title = normalizeText(job.titulo ?? "")

  switch (area) {
    case "tecnologia":
      return matchesTecnologia(job, blob, title)
    case "design":
      return hasAny(blob, DESIGN_POSITIVE)
    case "dados":
      return hasAny(blob, DADOS_POSITIVE)
    case "administracao":
      return hasAny(blob, ADMIN_POSITIVE)
    default:
      return true
  }
}
