import { describe, expect, it } from "vitest"
import type { JobListing } from "../types.js"
import { matchesArea } from "./area-filter.js"

function job(titulo: string, descricao = ""): JobListing {
  return {
    id: "gupy:1",
    fonte: "gupy",
    titulo,
    empresa: "Empresa",
    nivel: "Estágio",
    tipo_contrato: null,
    forma_trabalho: null,
    local: null,
    cidade: null,
    estado: null,
    salario: null,
    link: "https://exemplo.com",
    plataforma: "Gupy",
    tecnologias: [],
    descricao,
    publicado_em: null,
    slug: null,
  }
}

describe("matchesArea tecnologia", () => {
  it("aceita títulos de tecnologia", () => {
    expect(matchesArea(job("Estágio em TI"), "tecnologia")).toBe(true)
    expect(matchesArea(job("ESTÁGIO EM TI"), "tecnologia")).toBe(true)
    expect(matchesArea(job("Estágio em Engenharia de Software"), "tecnologia")).toBe(true)
    expect(matchesArea(job("Estágio em Tecnologia da Informação"), "tecnologia")).toBe(true)
  })

  it("rejeita títulos de outras áreas mesmo com descrição que cita software", () => {
    const desc = "Você vai usar o software interno e ferramentas mobile."
    expect(matchesArea(job("Estágio de Natação", desc), "tecnologia")).toBe(false)
    expect(matchesArea(job("Estágio em RH, Departamento Pessoal e Administrativo", desc), "tecnologia")).toBe(false)
    expect(matchesArea(job("Nube | Oportunidade de Estágio em Química - 333319", desc), "tecnologia")).toBe(false)
    expect(matchesArea(job("Estágio em Consultoria de Estratégia e Gestão", desc), "tecnologia")).toBe(false)
    expect(matchesArea(job("Monitor (Estágio) - Anos Finais", desc), "tecnologia")).toBe(false)
  })

  it("título neutro depende de sinal forte na descrição", () => {
    expect(
      matchesArea(job("Programa de Estágio 2027", "Atuação com desenvolvimento de software em React"), "tecnologia"),
    ).toBe(true)
    expect(matchesArea(job("Programa de Estágio 2027", "Atendimento ao cliente e vendas"), "tecnologia")).toBe(false)
  })
})
