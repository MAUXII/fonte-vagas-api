# fonte-vagas-api



API que **lista vagas** de várias fontes públicas - [Meu Padrinho](https://meupadrinho.com.br), [Gupy Portal](https://portal.gupy.io) e repositórios comunitários no GitHub.



Devolve **várias** vagas por request (até 50), com filtros por nível, **estado**, **cidade**, modalidade e palavra-chave. **Não** preenche formulário, **não** se candidata.



Feita para alimentar apps tipo JobStreak: você mostra o cardápio, a pessoa clica no `link` e aplica no site original.



> Agregador **não oficial**. Depende das APIs públicas continuarem disponíveis.



## Fontes



| ID | Origem | Observação |

|----|--------|------------|

| `meu-padrinho` | meupadrinho.com.br/api | Curadoria IA, nível explícito |

| `gupy` | employability-portal.gupy.io | Maior volume BR, cidade/estado estruturados |

| `github` | frontendbr/vagas, backend-br/vagas… | Issues abertas da comunidade |



## Rodar local



```bash

cd fonte-vagas-api

npm install

cp .env.example .env

npm run dev

```



Abre [http://localhost:4010](http://localhost:4010).



### Exemplos



```bash

# 10 estágios em SP (todas as fontes)

curl "http://localhost:4010/v1/jobs?nivel=estagio&estado=SP&limit=10"



# júnior remoto em Curitiba

curl "http://localhost:4010/v1/jobs?nivel=junior&cidade=Curitiba&forma_trabalho=remoto"



# só Gupy, busca por keyword

curl "http://localhost:4010/v1/jobs?nivel=pleno&fontes=gupy&q=react&estado=MG"



# detalhe (id composto)

curl "http://localhost:4010/v1/jobs/mp:9LiUhDMA"

curl "http://localhost:4010/v1/jobs/gupy:12498658"

curl "http://localhost:4010/v1/jobs/gh:frontendbr-vagas-8562"



# listar fontes

curl "http://localhost:4010/v1/jobs/fontes"

```



Texto completo: [http://localhost:4010/docs](http://localhost:4010/docs)



## Query `GET /v1/jobs`



| Param | Obrigatório | Descrição |

|-------|-------------|-----------|

| `nivel` | sim | `estagio` · `junior` · `pleno` · `senior` |

| `limit` | não | 1–50, default **10** |

| `page` | não | default **0** |

| `fontes` | não | csv: `meu-padrinho,gupy,github` |

| `estado` | não | UF ou nome — `SP`, `São Paulo`, `Paraná` |

| `cidade` | não | match parcial — `Campinas`, `Porto Alegre` |

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



| Var | Default | Uso |

|-----|---------|-----|

| `PORT` | 4010 | porta HTTP |

| `CACHE_TTL` | 300 | cache em segundos |

| `DEFAULT_FONTES` | todas | fontes padrão |

| `GITHUB_TOKEN` | — | rate limit GitHub (recomendado) |

| `GITHUB_REPOS` | 5 repos BR | csv `owner/repo` |



## Docker



```bash

docker compose up --build

```



Porta **4010**.



## Deploy



Ver [docs/DEPLOY.md](docs/DEPLOY.md).



## GitHub



https://github.com/MAUXII/fonte-vagas-api



## Licença



MIT — ver [LICENSE](LICENSE).

