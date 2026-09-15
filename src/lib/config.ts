export const config = {
  port: Number(process.env.PORT ?? 4010),
  cacheTtlMs: Number(process.env.CACHE_TTL ?? 300) * 1000,
  fetchConcurrency: Number(process.env.FETCH_CONCURRENCY ?? 4),
  meuPadrinhoBase: "https://meupadrinho.com.br/api",
}
