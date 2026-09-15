import { Router } from "express"
import { z } from "zod"
import { getJobById, searchJobs } from "../services/meu-padrinho.js"

const listQuery = z.object({
  nivel: z.enum(["estagio", "junior", "pleno", "senior"]),
  page: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  tipo_contrato: z.string().min(1).optional(),
  forma_trabalho: z.string().min(1).optional(),
  local: z.string().min(1).optional(),
})

export const jobsRouter = Router()

jobsRouter.get("/", async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      erro: "Query inválida",
      detalhes: parsed.error.flatten().fieldErrors,
    })
  }

  const q = parsed.data
  try {
    const vagas = await searchJobs({
      nivel: q.nivel,
      page: q.page,
      limit: q.limit,
      tipo_contrato: q.tipo_contrato,
      forma_trabalho: q.forma_trabalho,
      local: q.local,
    })

    return res.json({
      fonte: "meu-padrinho",
      total: vagas.length,
      page: q.page ?? 0,
      limit: q.limit ?? 10,
      filtros: {
        nivel: q.nivel,
        tipo_contrato: q.tipo_contrato,
        forma_trabalho: q.forma_trabalho,
        local: q.local,
      },
      vagas,
    })
  } catch (e) {
    console.error(e)
    return res.status(502).json({
      erro: "Falha ao consultar Meu Padrinho",
      dica: "Tente de novo em alguns minutos.",
    })
  }
})

jobsRouter.get("/:id", async (req, res) => {
  const job = await getJobById(req.params.id)
  if (!job) {
    return res.status(404).json({ erro: "Vaga não encontrada" })
  }
  return res.json({ fonte: "meu-padrinho", vaga: job })
})
