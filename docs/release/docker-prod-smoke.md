# Docker / Prod Smoke

## Maqsad
Deploydan keyin servislar tirikligini va monitoring endpointlar ishlashini tez tekshirish.

## Lokal production compose
```bash
copy .env.docker.prod.example .env.docker.prod
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile ops run --rm backend-migrate
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up --build -d
node tools/release-smoke.mjs
```

## Read-only smoke script
Majburiy env:
```bash
set RELEASE_BASE_URL=http://localhost:5000
set MONITORING_TOKEN=replace-with-real-monitoring-token
node tools/release-smoke.mjs
```

## Kutiladigan natija
- `/health` -> `200`
- `/ready` -> `200`
- `/metrics` -> `200` agar `MONITORING_TOKEN` berilgan bo'lsa

## Deploy bloklovchi signal
- `/ready` `503`
- migration xatosi
- backend container restart loop
- monitoring token bilan `/metrics` `401/503`
