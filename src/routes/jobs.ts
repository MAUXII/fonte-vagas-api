import { Router } from "express"
import { z } from "zod"
import type { JobListing } from "../types.js"
import { getJobById, listFontes, parseFontesQuery, searchAllJobs } from "../services/aggregator.js"

const listQuery = z.object({
  descricao: z.literal("completa").optional(),
  nivel: z.enum(["estagio", "junior", "pleno", "senior"]),
  page: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  fontes: z.string().min(1).optional(),
  tipo_contrato: z.string().min(1).optional(),
  forma_trabalho: z.string().min(1).optional(),
  estado: z.string().min(1).optional(),
  cidade: z.string().min(1).optional(),
  local: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  area: z.enum(["tecnologia", "design", "dados", "administracao", "qualquer"]).optional(),
})

export function serializeJob(job: JobListing, full: boolean): JobListing {
  const { descricaoCompleta, ...summary } = job
  return full ? { ...summary, descricao: descricaoCompleta ?? summary.descricao } : summary
}

export const jobsRouter = Router()

jobsRouter.get("/fontes", (_req, res) => {
  res.json(listFontes())
})

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
    const result = await searchAllJobs({
      nivel: q.nivel,
      page: q.page,
      limit: q.limit,
      fontes: parseFontesQuery(q.fontes),
      tipo_contrato: q.tipo_contrato,
      forma_trabalho: q.forma_trabalho,
      estado: q.estado,
      cidade: q.cidade,
      local: q.local,
      q: q.q,
      area: q.area,
    })

    return res.json({ ...result, vagas: result.vagas.map((job) => serializeJob(job, q.descricao === "completa")) })
  } catch (e) {
    console.error(e)
    return res.status(502).json({
      erro: "Falha ao agregar vagas",
      dica: "Tente de novo em alguns minutos ou reduza as fontes com ?fontes=meu-padrinho",
    })
  }
})

jobsRouter.get("/:id", async (req, res) => {
  const job = await getJobById(req.params.id)
  if (!job) {
    return res.status(404).json({ erro: "Vaga não encontrada" })
  }
  return res.json({ vaga: serializeJob(job, req.query.descricao === "completa") })
})
