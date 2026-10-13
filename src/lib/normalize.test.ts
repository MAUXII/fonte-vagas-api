import { describe, expect, it } from "vitest"
import { inferNivelFromText, nivelSlugMatches } from "./normalize.js"

describe("inferNivelFromText", () => {
  it("reconhece estágio no título", () => {
    expect(inferNivelFromText("Estágio em Desenvolvimento")).toBe("Estágio")
    expect(inferNivelFromText("Software Engineering Intern")).toBe("Estágio")
    expect(inferNivelFromText("Internship Program 2027")).toBe("Estágio")
  })

  it("não confunde palavras que começam com intern", () => {
    expect(inferNivelFromText("Tech Lead", "atuar em um projeto internacional")).toBeNull()
    expect(inferNivelFromText("Back-end Engineer", "ferramentas internas e internet")).toBeNull()
  })

  it("detecta júnior, pleno e sênior", () => {
    expect(inferNivelFromText("Desenvolvedor Jr")).toBe("Júnior")
    expect(inferNivelFromText("Desenvolvedora Pleno")).toBe("Pleno")
    expect(inferNivelFromText("Engenheiro Sênior")).toBe("Sênior")
  })
})

describe("nivelSlugMatches", () => {
  it("aceita estágio e trainee no slug estagio", () => {
    expect(nivelSlugMatches("Estágio", "estagio")).toBe(true)
    expect(nivelSlugMatches("Trainee", "estagio")).toBe(true)
    expect(nivelSlugMatches("Pleno", "estagio")).toBe(false)
  })
})
