import type { JobListing } from "../types.js"

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
}

export function normalizeJob(
  listItem: MpListItem,
  detail: MpDetail,
  tecnologias: string[],
): JobListing {
  return {
    id: listItem.nano_id,
    titulo: detail.titulo_vaga ?? listItem.titulo_vaga ?? "Sem título",
    empresa: detail.nome_empresa ?? listItem.nome_empresa ?? "—",
    nivel: detail.nivel ?? detail.nivel_vaga ?? listItem.nivel ?? null,
    tipo_contrato: detail.tipo_contrato ?? null,
    forma_trabalho: detail.forma_trabalho ?? null,
    local: detail.local ?? null,
    salario: detail.salario ?? null,
    link: detail.link_vaga ?? "",
    plataforma: detail.plataforma ?? null,
    tecnologias,
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
