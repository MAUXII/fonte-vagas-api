import { config } from "../lib/config.js"
import { createCache } from "../lib/cache.js"
import { UF_NAMES } from "../lib/location.js"
import { inferNivelFromText, normalizeText } from "../lib/normalize.js"
import type { JobFilters, JobListing } from "../types.js"

/**
 * Quadros de vagas públicos de ATS (Greenhouse, Lever, Ashby).
 * As três APIs são de leitura e não pedem token; a lista de empresas vem de `ATS_BOARDS`.
 */
export type AtsProvider = "greenhouse" | "lever" | "ashby"

type Board = { provider: AtsProvider; slug: string }

const ID_PREFIX: Record<AtsProvider, string> = { greenhouse: "grh", lever: "lev", ashby: "ash" }

const PLATFORM_LABEL: Record<AtsProvider, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
}

/** Nome de exibição quando a API devolve algo genérico ("Stone - Linkedin"). */
const COMPANY_NAMES: Record<string, string> = {
  stone: "Stone",
  wildlifestudios: "Wildlife Studios",
  ebanx: "EBANX",
  vtex: "VTEX",
  gympass: "Wellhub (Gympass)",
  c6bank: "C6 Bank",
  xpinc: "XP Inc.",
  quintoandar: "QuintoAndar",
  rdstation: "RD Station",
  jusbrasil: "Jusbrasil",
  inter: "Banco Inter",
  ciandt: "CI&T",
  neon: "Neon",
  swile: "Swile",
  nubank: "Nubank",
}

const boardCache = createCache<JobListing[]>()

export function parseBoards(raw: string[]): Board[] {
  const out: Board[] = []
  for (const entry of raw) {
    const [provider, slug] = entry.split(":").map((s) => s.trim())
    if (!slug) continue
    if (provider === "greenhouse" || provider === "lever" || provider === "ashby") {
      out.push({ provider, slug })
    }
  }
  return out
}

const NAME_TO_UF = new Map(Object.entries(UF_NAMES).map(([uf, name]) => [name, uf]))

/** Separa cidade/UF de textos como "Sao Paulo, Sao Paulo, Brasil" ou "Curitiba | On-site". */
export function parseAtsLocation(raw: string): {
  cidade: string | null
  estado: string | null
  brasil: boolean
  remoto: boolean
} {
  const text = normalizeText(raw)
  const parts = raw
    .split(/[,;|/]| - /)
    .map((p) => p.trim())
    .filter(Boolean)

  let estado: string | null = null
  for (const part of parts) {
    const n = normalizeText(part)
    if (n.length === 2 && UF_NAMES[n.toUpperCase()]) estado = n.toUpperCase()
    else if (NAME_TO_UF.has(n)) estado = NAME_TO_UF.get(n)!
  }

  const first = parts[0] ?? null
  const firstNorm = first ? normalizeText(first) : ""
  const firstIsGeneric = /^(brasil|brazil|remote|remoto|latam|hybrid|hibrido|on-site)$/.test(firstNorm)
  // capital com o mesmo nome do estado ("Sao Paulo, Sao Paulo")
  const cidade = first && !firstIsGeneric && (!NAME_TO_UF.has(firstNorm) || parts.length > 1) ? first : null

  const brasil =
    /\bbrasil\b|\bbrazil\b/.test(text) ||
    estado !== null ||
    /\b(sao paulo|rio de janeiro|belo horizonte|curitiba|florianopolis|porto alegre|recife|campinas)\b/.test(text)
  const remoto = /\bremot[eo]\b|home ?office/.test(text)

  return { cidade, estado, brasil, remoto }
}

function workplace(remoto: boolean, raw?: string | null): string | null {
  const n = normalizeText(raw ?? "")
  if (remoto || n.includes("remote")) return "Remoto"
  if (n.includes("hybrid")) return "Híbrido"
  if (n.includes("on-site") || n.includes("onsite")) return "Presencial"
  return null
}

function buildListing(
  board: Board,
  fields: {
    id: string
    titulo: string
    empresa?: string | null
    location: string
    workplaceRaw?: string | null
    countryIsBrazil?: boolean
    link: string
    descricao?: string | null
    tipo?: string | null
    publicadoEm?: string | null
  },
): JobListing | null {
  const loc = parseAtsLocation(fields.location)
  if (!loc.brasil && !fields.countryIsBrazil) return null

  const forma = workplace(loc.remoto, fields.workplaceRaw)
  const nivel = inferNivelFromText(fields.titulo)
  return {
    id: `${ID_PREFIX[board.provider]}:${board.slug}-${fields.id}`,
    fonte: board.provider,
    titulo: fields.titulo.trim(),
    empresa: COMPANY_NAMES[board.slug] ?? fields.empresa ?? board.slug,
    nivel,
    tipo_contrato: nivel === "Estágio" ? "Estágio" : (fields.tipo ?? null),
    forma_trabalho: forma,
    local: forma === "Remoto" && !loc.cidade ? "Remoto" : fields.location,
    cidade: loc.cidade,
    estado: loc.estado,
    salario: null,
    link: fields.link,
    plataforma: PLATFORM_LABEL[board.provider],
    tecnologias: [],
    descricao: fields.descricao?.slice(0, 500) ?? null,
    publicado_em: fields.publicadoEm ?? null,
    slug: `${board.provider}/${board.slug}`,
    logo: null,
  }
}

type GreenhouseJob = {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string }
  company_name?: string
  first_published?: string
  updated_at?: string
}

type LeverPosting = {
  id: string
  text: string
  hostedUrl: string
  country?: string
  workplaceType?: string
  createdAt?: number
  descriptionPlain?: string
  categories?: { location?: string; commitment?: string; allLocations?: string[] }
}

type AshbyJob = {
  id: string
  title: string
  jobUrl: string
  location?: string
  isRemote?: boolean
  isListed?: boolean
  workplaceType?: string
  employmentType?: string
  publishedAt?: string
  descriptionPlain?: string
  address?: { postalAddress?: { addressCountry?: string } }
}

async function getJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "fonte-vagas-api" },
  })
  if (!res.ok) throw new Error(`${label} ${res.status}`)
  return res.json() as Promise<T>
}

async function fetchBoard(board: Board): Promise<JobListing[]> {
  const key = `${board.provider}:${board.slug}`
  const cached = boardCache.get(key)
  if (cached) return cached

  let jobs: (JobListing | null)[] = []

  if (board.provider === "greenhouse") {
    const data = await getJson<{ jobs?: GreenhouseJob[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs`,
      `Greenhouse ${board.slug}`,
    )
    jobs = (data.jobs ?? []).map((j) =>
      buildListing(board, {
        id: String(j.id),
        titulo: j.title,
        empresa: j.company_name,
        location: j.location?.name ?? "",
        link: j.absolute_url,
        publicadoEm: j.first_published ?? j.updated_at ?? null,
      }),
    )
  } else if (board.provider === "lever") {
    const data = await getJson<LeverPosting[]>(
      `https://api.lever.co/v0/postings/${board.slug}?mode=json`,
      `Lever ${board.slug}`,
    )
    jobs = data.map((j) =>
      buildListing(board, {
        id: j.id,
        titulo: j.text,
        location: j.categories?.location ?? j.categories?.allLocations?.join(", ") ?? "",
        workplaceRaw: j.workplaceType,
        countryIsBrazil: j.country === "BR",
        link: j.hostedUrl,
        descricao: j.descriptionPlain,
        tipo: j.categories?.commitment ?? null,
        publicadoEm: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      }),
    )
  } else {
    const data = await getJson<{ jobs?: AshbyJob[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${board.slug}`,
      `Ashby ${board.slug}`,
    )
    jobs = (data.jobs ?? [])
      .filter((j) => j.isListed !== false)
      .map((j) =>
        buildListing(board, {
          id: j.id,
          titulo: j.title,
          location: j.location ?? "",
          workplaceRaw: j.isRemote ? "remote" : j.workplaceType,
          countryIsBrazil: normalizeText(j.address?.postalAddress?.addressCountry ?? "") === "brazil",
          link: j.jobUrl,
          descricao: j.descriptionPlain,
          tipo: j.employmentType ?? null,
          publicadoEm: j.publishedAt ?? null,
        }),
      )
  }

  const out = jobs.filter((j): j is JobListing => j !== null)
  boardCache.set(key, out, config.atsCacheTtlMs)
  return out
}

function boardsFor(provider: AtsProvider): Board[] {
  return parseBoards(config.atsBoards).filter((b) => b.provider === provider)
}

/** Cria o adapter de um provedor; o filtro de nível/área/local fica no agregador. */
export function atsSearch(provider: AtsProvider) {
  return async (_params: JobFilters, _fetchLimit: number): Promise<JobListing[]> => {
    const results = await Promise.allSettled(boardsFor(provider).map(fetchBoard))
    const jobs: JobListing[] = []
    const errors: string[] = []
    for (const r of results) {
      if (r.status === "fulfilled") jobs.push(...r.value)
      else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
    }
    if (jobs.length === 0 && errors.length > 0) throw new Error(errors.join("; "))
    // devolve tudo: o agregador filtra depois e estágio é raro nesses quadros
    return jobs
  }
}

export function atsGet(provider: AtsProvider) {
  return async (rawId: string): Promise<JobListing | null> => {
    const dash = rawId.indexOf("-")
    if (dash < 0) return null
    const slug = rawId.slice(0, dash)
    const board = boardsFor(provider).find((b) => b.slug === slug)
    if (!board) return null
    const jobs = await fetchBoard(board)
    return jobs.find((j) => j.id === `${ID_PREFIX[provider]}:${rawId}`) ?? null
  }
}
