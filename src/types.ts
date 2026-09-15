export type JobSource = "meu-padrinho" | "gupy" | "github"

export type NivelSlug = "estagio" | "junior" | "pleno" | "senior"

/** Vaga normalizada — contrato estável para consumidores (JobStreak, etc.). */
export type JobListing = {
  /** Formato `{fonte}:{id}` — ex.: `mp:9LiUhDMA`, `gupy:12498658`, `gh:frontendbr-8562` */
  id: string
  fonte: JobSource
  titulo: string
  empresa: string
  nivel: string | null
  tipo_contrato: string | null
  forma_trabalho: string | null
  /** Local completo (legado + display). */
  local: string | null
  cidade: string | null
  estado: string | null
  salario: string | null
  link: string
  plataforma: string | null
  tecnologias: string[]
  descricao: string | null
  publicado_em: string | null
  slug: string | null
}

export type JobFilters = {
  nivel: NivelSlug
  page?: number
  limit?: number
  fontes?: JobSource[]
  tipo_contrato?: string
  forma_trabalho?: string
  estado?: string
  cidade?: string
  local?: string
  q?: string
}

export type SourceFetchResult = {
  fonte: JobSource
  vagas: JobListing[]
  erro?: string
}

export type JobsListResponse = {
  total: number
  page: number
  limit: number
  filtros: Record<string, string | string[] | number | undefined>
  fontes_consultadas: JobSource[]
  por_fonte: Record<string, number>
  avisos: string[]
  vagas: JobListing[]
}
