# fonte-vagas-api

API REST que agrega vagas de várias fontes públicas brasileiras ([Meu Padrinho](https://meupadrinho.com.br), [Gupy Portal](https://portal.gupy.io) e repositórios comunitários no GitHub) em um formato único.

Devolve até 50 vagas por request, com filtros por nível, estado, cidade, modalidade e palavra-chave. Não preenche formulário nem se candidata: cada vaga traz o `link` para aplicar no site original.

> Agregador não oficial. Depende das APIs públicas continuarem disponíveis.

## Fontes

| ID | Origem | Observação |
|----|--------|------------|
| `meu-padrinho` | meupadrinho.com.br/api | Curadoria por IA, nível explícito |
| `gupy` | employability-portal.gupy.io | Maior volume no Brasil, cidade e estado estruturados |
| `github` | frontendbr/vagas, backend-br/vagas… | Issues abertas da comunidade |

## Como funciona

- Cada fonte tem um serviço próprio (`src/services`) que busca e normaliza as vagas para o mesmo formato (`src/lib/normalize.ts`).
- O agregador consulta as fontes em paralelo, com limite de concorrência, e junta os resultados.
- Respostas ficam em cache em memória por fonte (`CACHE_TTL`), para não estourar rate limit.
- IDs compostos (`gupy:123`, `mp:abc`, `gh:repo-123`) identificam a origem de cada vaga.

## Rodar local

```bash
npm install
cp .env.example .env
npm run dev
```

API em [http://localhost:4010](http://localhost:4010). Documentação em texto em `/docs`.

### Exemplos

```bash
# 10 estágios em SP (todas as fontes)
curl "http://localhost:4010/v1/jobs?nivel=estagio&estado=SP&limit=10"

# júnior remoto em Curitiba
curl "http://localhost:4010/v1/jobs?nivel=junior&cidade=Curitiba&forma_trabalho=remoto"

# só Gupy, busca por palavra-chave
curl "http://localhost:4010/v1/jobs?nivel=pleno&fontes=gupy&q=react&estado=MG"

# detalhe de uma vaga (id composto)
curl "http://localhost:4010/v1/jobs/gupy:12498658"

# fontes disponíveis
curl "http://localhost:4010/v1/jobs/fontes"
```

## `GET /v1/jobs`

| Param | Obrigatório | Descrição |
|-------|-------------|-----------|
| `nivel` | sim | `estagio` · `junior` · `pleno` · `senior` |
| `limit` | não | 1–50, padrão **10** |
| `page` | não | padrão **0** |
| `fontes` | não | csv: `meu-padrinho,gupy,github` |
| `estado` | não | UF ou nome: `SP`, `São Paulo`, `Paraná` |
| `cidade` | não | match parcial: `Campinas`, `Porto Alegre` |
| `local` | não | busca em qualquer campo de local (legado) |
| `forma_trabalho` | não | `remoto`, `híbrido`, `presencial` |
| `tipo_contrato` | não | `CLT`, `PJ`, `Estágio`… |
| `q` | não | palavra-chave; no Gupy vira termo de busca |

Resposta:

```json
{
  "total": 10,
  "page": 0,
  "limit": 10,
  "fontes_consultadas": ["meu-padrinho", "gupy", "github"],
  "por_fonte": { "meu-padrinho": 8, "gupy": 10, "github": 6 },
  "avisos": [],
  "filtros": { "nivel": "estagio", "estado": "SP" },
  "vagas": [
    {
      "id": "gupy:12498658",
      "fonte": "gupy",
      "titulo": "Estágio em…",
      "empresa": "Via de Acesso",
      "nivel": "Estágio",
      "tipo_contrato": "Estágio",
      "forma_trabalho": "Presencial",
      "local": "São Paulo, SP",
      "cidade": "São Paulo",
      "estado": "SP",
      "link": "https://…gupy.io/job/…",
      "plataforma": "Gupy",
      "tecnologias": [],
      "descricao": "…",
      "publicado_em": "2026-09-15T22:40:47.665Z",
      "slug": null
    }
  ]
}
```

## Variáveis de ambiente

| Var | Padrão | Uso |
|-----|--------|-----|
| `PORT` | 4010 | porta HTTP |
| `CACHE_TTL` | 300 | cache em segundos |
| `FETCH_CONCURRENCY` | 4 | detalhes buscados em paralelo por request |
| `DEFAULT_FONTES` | todas | fontes padrão |
| `GITHUB_TOKEN` | — | sobe o rate limit do GitHub de 60/h para 5000/h |
| `GITHUB_REPOS` | repos BR | csv `owner/repo` |

## Docker

```bash
docker compose up --build
```

Roda em qualquer host com Docker. Healthcheck em `GET /health`.

## Licença

MIT. Ver [LICENSE](LICENSE).
