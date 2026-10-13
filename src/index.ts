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
    descricao:
      "Agrega vagas de fontes públicas. Listagem paginada em JSON. Não se candidata por você.",
    docs: "/docs",
    rotas: {
      saude: "GET /health",
      fontes: "GET /v1/jobs/fontes",
      listar: "GET /v1/jobs?nivel=estagio&estado=SP&area=tecnologia",
      detalhe: "GET /v1/jobs/:id",
    },
    fontes: config.defaultFontes,
    niveis: ["estagio", "junior", "pleno", "senior"],
  })
})

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), fontes: config.defaultFontes })
})

app.get("/docs", (_req, res) => {
  res.type("text/plain").send(`fonte-vagas-api

Fontes padrao: ${config.defaultFontes.join(", ")}

GET /v1/jobs/fontes
  Lista fontes disponiveis.

GET /v1/jobs
  nivel          estagio | junior | pleno | senior  (obrigatorio)
  limit          1 a 50, default 10
  page           default 0
  fontes         csv opcional, ex: gupy,github,linkedin
  area           tecnologia | design | dados | administracao | qualquer
  estado         UF ou nome, ex: SP, Sao Paulo
  cidade         match parcial, ex: Curitiba
  forma_trabalho remoto, hibrido, presencial
  tipo_contrato  CLT, PJ, Estagio
  q              palavra-chave

GET /v1/jobs/:id
  ID composto: gupy:12345 | gh:frontendbr-vagas-8562 | li:abc123 | mp:NANO_ID

Exemplos:
  /v1/jobs?nivel=estagio&estado=SP&area=tecnologia&limit=10
  /v1/jobs?nivel=junior&cidade=Curitiba&forma_trabalho=remoto
  /v1/jobs?nivel=pleno&fontes=gupy&q=react
`)
})

app.use("/v1/jobs", jobsRouter)

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" })
})

// Na Vercel o app vira função serverless: ela importa o default export e não usa listen.
if (!process.env.VERCEL) {
  const server = app.listen(config.port, () => {
    console.log(`fonte-vagas-api → http://localhost:${config.port}`)
    console.log(`docs → http://localhost:${config.port}/docs`)
  })

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPorta ${config.port} ja esta em uso. Encerre o processo anterior ou use outra porta.\n`,
      )
      process.exit(1)
    }
    throw err
  })
}

export default app
