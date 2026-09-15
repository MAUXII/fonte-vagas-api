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
    versao: "0.1.0",
    docs: "/docs",
    rotas: {
      saude: "GET /health",
      listar: "GET /v1/jobs?nivel=estagio&limit=10",
      detalhe: "GET /v1/jobs/:id",
    },
    niveis: ["estagio", "junior", "pleno", "senior"],
    aviso:
      "Agregador não oficial. Não se candidata por você — só repassa link e metadados.",
  })
})

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

app.get("/docs", (_req, res) => {
  res.type("text/plain").send(`fonte-vagas-api — referência rápida

GET /v1/jobs
  nivel          estagio | junior | pleno | senior  (obrigatório)
  limit          1–50, default 10
  page           default 0
  tipo_contrato  filtro parcial (ex: CLT, Estágio)
  forma_trabalho filtro parcial (ex: remoto, híbrido)
  local          filtro parcial (ex: São Paulo)

GET /v1/jobs/:id
  nano_id da vaga no Meu Padrinho

Exemplo:
  /v1/jobs?nivel=estagio&limit=10&forma_trabalho=remoto
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
