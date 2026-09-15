import { parseBrazilLocation } from "./location.js"
import type { JobListing, JobSource } from "../types.js"

type MpListItem = {
  nano_id: string
  titulo_vaga?: string
  nome_empresa?: string
  nivel?: string
}

type MpDetail = {
  titulo_vaga?: string
  nome_empresa?: string
  nivel?: string
  nivel_vaga?: string
  tipo_contrato?: string
  forma_trabalho?: string
  local?: string
  salario?: string
  link_vaga?: string
  plataforma?: string
  horario_registro?: string
  slug?: string
  descricao_vaga?: string
}

export function normalizeMeuPadrinhoJob(
  listItem: MpListItem,
  detail: MpDetail,
  tecnologias: string[],
): JobListing {
  const loc = parseBrazilLocation(detail.local ?? null)
  return {
    id: `mp:${listItem.nano_id}`,
    fonte: "meu-padrinho",
    titulo: detail.titulo_vaga ?? listItem.titulo_vaga ?? "Sem título",
    empresa: detail.nome_empresa ?? listItem.nome_empresa ?? "—",
    nivel: detail.nivel ?? detail.nivel_vaga ?? listItem.nivel ?? null,
    tipo_contrato: detail.tipo_contrato || null,
    forma_trabalho: detail.forma_trabalho ?? null,
    local: loc.local,
    cidade: loc.cidade,
    estado: loc.estado,
    salario: detail.salario || null,
    link: detail.link_vaga ?? "",
    plataforma: detail.plataforma ?? null,
    tecnologias,
    descricao: detail.descricao_vaga ?? null,
    publicado_em: detail.horario_registro ?? null,
    slug: detail.slug ?? null,
  }
}

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function matchesFilter(value: string | null, filter?: string): boolean {
  if (!filter) return true
  if (!value) return false
  return normalizeText(value).includes(normalizeText(filter))
}

export function inferNivelFromText(...parts: (string | null | undefined)[]): string | null {
  const blob = normalizeText(parts.filter(Boolean).join(" "))
  if (/\bestagi(o|io|aria)\b/.test(blob) || blob.includes("intern")) return "Estágio"
  if (/\btrainee\b/.test(blob) || blob.includes("aprendiz")) return "Trainee"
  if (/\bjunior\b|\bjr\b|\bjunior\b/.test(blob)) return "Júnior"
  if (/\bpleno\b|\bpl\b/.test(blob)) return "Pleno"
  if (/\bsenior\b|\bsr\b|\bespecialista\b/.test(blob)) return "Sênior"
  return null
}

export function nivelSlugMatches(jobNivel: string | null, slug: string): boolean {
  if (!jobNivel) return true
  const n = normalizeText(jobNivel)
  const map: Record<string, string[]> = {
    estagio: ["estagio", "trainee", "aprendiz", "intern"],
    junior: ["junior", "jr"],
    pleno: ["pleno"],
    senior: ["senior", "sr", "especialista"],
  }
  return (map[slug] ?? []).some((k) => n.includes(k))
}

export function parseJobId(raw: string): { fonte: JobSource; id: string } | null {
  const m = raw.match(/^(mp|gupy|gh):(.+)$/)
  if (!m) return null
  const prefix = m[1]!
  const id = m[2]!
  const fonteMap: Record<string, JobSource> = {
    mp: "meu-padrinho",
    gupy: "gupy",
    gh: "github",
  }
  return { fonte: fonteMap[prefix]!, id }
}

export function formatLocal(cidade: string | null, estado: string | null): string | null {
  if (cidade && estado) return `${cidade}, ${estado}`
  return cidade ?? estado ?? null
}
