import { normalizeText } from "./normalize.js"

/** Sigla → nome completo (sem acento, minúsculo). */
export const UF_NAMES: Record<string, string> = {
  AC: "acre",
  AL: "alagoas",
  AP: "amapa",
  AM: "amazonas",
  BA: "bahia",
  CE: "ceara",
  DF: "distrito federal",
  ES: "espirito santo",
  GO: "goias",
  MA: "maranhao",
  MT: "mato grosso",
  MS: "mato grosso do sul",
  MG: "minas gerais",
  PA: "para",
  PB: "paraiba",
  PR: "parana",
  PE: "pernambuco",
  PI: "piaui",
  RJ: "rio de janeiro",
  RN: "rio grande do norte",
  RS: "rio grande do sul",
  RO: "rondonia",
  RR: "roraima",
  SC: "santa catarina",
  SP: "sao paulo",
  SE: "sergipe",
  TO: "tocantins",
}

const NAME_TO_UF = Object.fromEntries(
  Object.entries(UF_NAMES).map(([uf, name]) => [name, uf]),
)

export type ParsedLocation = {
  cidade: string | null
  estado: string | null
  /** Texto original ou montado. */
  local: string | null
}

export function parseBrazilLocation(raw: string | null | undefined): ParsedLocation {
  if (!raw?.trim()) {
    return { cidade: null, estado: null, local: null }
  }

  const text = raw.trim()
  const lower = normalizeText(text)

  if (
    lower === "remoto" ||
    lower === "remote" ||
    lower.includes("qualquer lugar") ||
    lower.includes("worldwide")
  ) {
    return { cidade: null, estado: null, local: text }
  }

  // São Paulo, SP
  const comma = text.match(/^(.+?),\s*([A-Za-z]{2})\s*$/)
  if (comma) {
    const estado = comma[2]!.toUpperCase()
    return {
      cidade: comma[1]!.trim(),
      estado: UF_NAMES[estado] ? estado : null,
      local: text,
    }
  }

  // Curitiba/PR ou Curitiba - PR
  const slash = text.match(/^(.+?)[/\-]\s*([A-Za-z]{2})\s*$/)
  if (slash) {
    const estado = slash[2]!.toUpperCase()
    return {
      cidade: slash[1]!.trim(),
      estado: UF_NAMES[estado] ? estado : null,
      local: text,
    }
  }

  // Só sigla
  if (/^[A-Za-z]{2}$/.test(text)) {
    const estado = text.toUpperCase()
    return {
      cidade: null,
      estado: UF_NAMES[estado] ? estado : null,
      local: text,
    }
  }

  // Nome de estado sozinho
  const asUf = NAME_TO_UF[lower]
  if (asUf) {
    return { cidade: null, estado: asUf, local: text }
  }

  return { cidade: text, estado: null, local: text }
}

export function resolveStateToken(filter: string): { uf: string | null; name: string } {
  const n = normalizeText(filter)
  if (n.length === 2 && UF_NAMES[n.toUpperCase()]) {
    const uf = n.toUpperCase()
    return { uf, name: UF_NAMES[uf]! }
  }
  const uf = NAME_TO_UF[n]
  if (uf) return { uf, name: UF_NAMES[uf]! }
  return { uf: null, name: n }
}

export function matchesState(
  estado: string | null,
  cidade: string | null,
  local: string | null,
  filter?: string,
): boolean {
  if (!filter) return true

  const { uf, name } = resolveStateToken(filter)
  const blob = normalizeText([estado, cidade, local].filter(Boolean).join(" "))

  if (uf) {
    if (estado && normalizeText(estado) === uf.toLowerCase()) return true
    if (estado && normalizeText(UF_NAMES[uf] ?? "") === name) return true
    if (local && normalizeText(local).includes(uf.toLowerCase())) return true
    if (local && normalizeText(local).includes(name)) return true
    return false
  }

  return blob.includes(name)
}

export function matchesCity(
  cidade: string | null,
  local: string | null,
  filter?: string,
): boolean {
  if (!filter) return true
  const f = normalizeText(filter)
  if (cidade && normalizeText(cidade).includes(f)) return true
  if (local && normalizeText(local).includes(f)) return true
  return false
}
