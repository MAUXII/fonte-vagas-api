/** Vaga normalizada — contrato estável para consumidores (JobStreak, etc.). */
export type JobListing = {
  id: string
  titulo: string
  empresa: string
  nivel: string | null
  tipo_contrato: string | null
  forma_trabalho: string | null
  local: string | null
  salario: string | null
  link: string
  plataforma: string | null
  tecnologias: string[]
  publicado_em: string | null
  slug: string | null
}

export type JobsListResponse = {
  fonte: "meu-padrinho"
  total: number
  page: number
  limit: number
  filtros: Record<string, string | undefined>
  vagas: JobListing[]
}
