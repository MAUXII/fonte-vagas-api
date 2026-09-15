import cors from "cors"
import express from "express"
import { config } from "./lib/config.js"
import { jobsRouter } from "./routes/jobs.js"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (_req, res) => {
  res.json({
    nome: "fonte-vagas-api",
    versao: "0.2.0",
    docs: "/docs",
    rotas: {
      saude: "GET /health",
      fontes: "GET /v1/jobs/fontes",
      listar: "GET /v1/jobs?nivel=estagio&estado=SP&cidade=São Paulo",
      detalhe: "GET /v1/jobs/:id",
    },
    fontes: config.defaultFontes,
    niveis: ["estagio", "junior", "pleno", "senior"],
    aviso:
      "Agregador não oficial. Não se candidata por você — só repassa link e metadados.",
  })
})

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), fontes: config.defaultFontes })
})

app.get("/docs", (_req, res) => {
  res.type("text/plain").send(`fonte-vagas-api — referência

Fontes: meu-padrinho, gupy, github (default: todas)

GET /v1/jobs/fontes
  Lista fontes disponíveis e repos GitHub configurados.

GET /v1/jobs
  nivel          estagio | junior | pleno | senior  (obrigatório)
  limit          1–50, default 10
  page           default 0
  fontes         meu-padrinho,gupy,github  (csv, opcional)
  estado         UF ou nome — ex: SP, São Paulo, Paraná
  cidade         match parcial — ex: Curitiba, Campinas
  local          match em qualquer campo de local (legado)
  forma_trabalho remoto, híbrido, presencial
  tipo_contrato  CLT, PJ, Estágio…
  q              palavra-chave no título (Gupy usa como jobName)

GET /v1/jobs/:id
  ID composto: mp:NANO_ID | gupy:12345 | gh:frontendbr-vagas-8562
  (IDs antigos só com nano_id ainda funcionam no Meu Padrinho)

Exemplos:
  /v1/jobs?nivel=estagio&estado=SP&limit=10
  /v1/jobs?nivel=junior&cidade=Curitiba&forma_trabalho=remoto
  /v1/jobs?nivel=pleno&fontes=gupy,meu-padrinho&estado=RJ
  /v1/jobs?nivel=estagio&q=react&fontes=gupy
`)
})

app.use("/v1/jobs", jobsRouter)

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" })
})

app.listen(config.port, () => {
  console.log(`fonte-vagas-api → http://localhost:${config.port}`)
  console.log(`docs → http://localhost:${config.port}/docs`)
})
