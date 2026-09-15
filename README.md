# fonte-vagas-api

API pequena que **lista vagas** agregadas de fontes públicas — hoje só [Meu Padrinho](https://meupadrinho.com.br).  
Devolve **várias** vagas por request (até 50), com filtros básicos. **Não** preenche formulário, **não** se candidata.

Feita para alimentar apps tipo JobStreak: você mostra o cardápio, a pessoa clica no `link` e aplica no site original.

> Agregador **não oficial**. Depende da API pública do Meu Padrinho continuar disponível.

## Diferença pro [api-vagas](https://github.com/matheusaudibert/api-vagas)

| | api-vagas | fonte-vagas-api |
|---|-----------|-----------------|
| Vagas por call | 1 | até **50** (default **10**) |
| Filtros | só nível na URL | nível + `tipo_contrato`, `forma_trabalho`, `local` |
| Contrato | JSON solto | schema estável `JobListing` |

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
# 10 estágios (default)
curl "http://localhost:4010/v1/jobs?nivel=estagio"

# remoto, limite 5
curl "http://localhost:4010/v1/jobs?nivel=junior&limit=5&forma_trabalho=remoto"

# uma vaga pelo id
curl "http://localhost:4010/v1/jobs/NANO_ID"
```

Texto completo: [http://localhost:4010/docs](http://localhost:4010/docs)

## Query `GET /v1/jobs`

| Param | Obrigatório | Descrição |
|-------|-------------|-----------|
| `nivel` | sim | `estagio` · `junior` · `pleno` · `senior` |
| `limit` | não | 1–50, default **10** |
| `page` | não | página no Meu Padrinho, default **0** |
| `tipo_contrato` | não | match parcial (ex.: `CLT`, `Estágio`) |
| `forma_trabalho` | não | ex.: `remoto`, `híbrido` |
| `local` | não | ex.: `São Paulo` |

Resposta:

```json
{
  "fonte": "meu-padrinho",
  "total": 10,
  "page": 0,
  "limit": 10,
  "filtros": { "nivel": "estagio" },
  "vagas": [
    {
      "id": "…",
      "titulo": "…",
      "empresa": "…",
      "nivel": "estagio",
      "tipo_contrato": "Estágio",
      "forma_trabalho": "Remoto",
      "local": "…",
      "salario": null,
      "link": "https://…",
      "plataforma": "…",
      "tecnologias": ["React", "Node"],
      "publicado_em": "…",
      "slug": "…"
    }
  ]
}
```

## Docker

```bash
docker compose up --build
```

Porta **4010**.

## Onde hospedar (ficar “no ar”)

Resumo — detalhes em [docs/DEPLOY.md](docs/DEPLOY.md):

| Opção | Custo | Pra quem |
|-------|-------|----------|
| **VPS + Docker** (Hetzner, Contabo, Oracle free tier) | baixo / grátis | self-hosted JobStreak na mesma máquina |
| **Railway / Render / Fly.io** | free tier limitado | teste rápido, URL pública |
| **Homelab** (PC/servidor em casa) | luz | você + reverse proxy (Caddy/nginx) |
| **Mesmo compose do JobStreak** | — | serviço `fonte-vagas-api` na rede interna |

Recomendação: **Docker na mesma VPS do JobStreak**, URL interna `http://fonte-vagas:4010` — não precisa expor na internet se só o app consome.

## GitHub

Repo separado do JobStreak. Depois de criar no GitHub:

```bash
git init -b main
git add .
git commit -m "feat: API agregadora Meu Padrinho com listagem paginada"
git remote add origin https://github.com/MAUXII/fonte-vagas-api.git
git push -u origin main
```

## Licença

MIT — ver [LICENSE](LICENSE).

Crédito: inspirado no padrão de consumo do [api-vagas](https://github.com/matheusaudibert/api-vagas) (MIT).
