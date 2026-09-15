# Deploy — fonte-vagas-api

Como deixar a API **funcionando 24/7**.

## 1. Mesma máquina do JobStreak (recomendado)

No `docker-compose` do JobStreak (futuro), adicionar serviço:

```yaml
  fonte-vagas:
    image: ghcr.io/MAUXII/fonte-vagas-api:latest
    # ou build: ../fonte-vagas-api
    restart: unless-stopped
    environment:
      PORT: 4010
      CACHE_TTL: 300
```

JobStreak chama `http://fonte-vagas:4010/v1/jobs?...` na rede Docker. **Nada exposto** pra internet.

## 2. VPS barata

1. Aluga VPS (Hetzner CX22, Contabo, Oracle Always Free…).
2. Instala Docker.
3. `git clone` + `docker compose up -d`.
4. (Opcional) Caddy/nginx com HTTPS em `vagas.seudominio.com`.

```bash
git clone https://github.com/MAUXII/fonte-vagas-api.git
cd fonte-vagas-api
docker compose up -d
```

## 3. Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Root: repo `fonte-vagas-api`.
3. Start command: `npm run build && npm start` ou Dockerfile.
4. Variável `PORT` — Railway injeta automaticamente; ajuste `config` se precisar ler `process.env.PORT` (já lê).

Plano free dorme após inatividade — ok para dev, ruim para produção sem ping.

## 4. Render

1. [render.com](https://render.com) → Web Service → repo GitHub.
2. Runtime: Docker **ou** Node (`build: npm ci && npm run build`, `start: npm start`).
3. Free tier: spin down com idle — mesma ressalva.

## 5. Fly.io

```bash
fly launch
fly deploy
```

Região `gru` (São Paulo) reduz latência pro Meu Padrinho.

## 6. Não use

- **Vercel / Netlify serverless** — API Express long-running não é o forte; cold start e timeout.
- **Depender de api-vagas de terceiro** em produção — self-host esta API.

## Monitoramento mínimo

- `GET /health` → `{ "ok": true }`
- Uptime Kuma, Better Stack, ou cron `curl` a cada 5 min
- Logs: `docker compose logs -f api`

## Cache

Default **5 min** (`CACHE_TTL=300`). Aumente se bater rate limit no Meu Padrinho; diminua se quiser vagas mais frescas.
