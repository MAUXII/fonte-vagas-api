import { describe, expect, it } from "vitest"
import { parseAtsLocation, parseBoards } from "./ats.js"

describe("parseAtsLocation", () => {
  it("extrai cidade e UF de formatos comuns de ATS", () => {
    expect(parseAtsLocation("Sao Paulo, Sao Paulo, Brasil")).toMatchObject({
      cidade: "Sao Paulo",
      estado: "SP",
      brasil: true,
    })
    expect(parseAtsLocation("Curitiba | On-site")).toMatchObject({ cidade: "Curitiba", brasil: true })
    expect(parseAtsLocation("São Paulo, SP")).toMatchObject({ estado: "SP", brasil: true })
  })

  it("marca remoto no Brasil sem cidade", () => {
    expect(parseAtsLocation("Remoto, Brasil")).toMatchObject({ cidade: null, brasil: true, remoto: true })
  })

  it("descarta locais fora do Brasil", () => {
    expect(parseAtsLocation("New York City").brasil).toBe(false)
    expect(parseAtsLocation("Remote or Hybrid in Miami, FL").brasil).toBe(false)
  })
})

describe("parseBoards", () => {
  it("ignora provedores desconhecidos e entradas sem slug", () => {
    expect(parseBoards(["greenhouse:stone", "workday:x", "lever:", "ashby:nubank"])).toEqual([
      { provider: "greenhouse", slug: "stone" },
      { provider: "ashby", slug: "nubank" },
    ])
  })
})
