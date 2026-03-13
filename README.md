# maktab_CRM

Maktab uchun CRM tizimi: Admin, Teacher, Student rollari, dars jadvali, davomat, baholash, hujjatlar.

## Stack
- Backend: Node.js, Express, Prisma, PostgreSQL
- Frontend: React, Redux Toolkit, React Router, Tailwind

## Papkalar
- `backend/` API, Prisma schema/migrations, seed, testlar
- `frontend/` UI, router, feature slice/thunklar

## Backend ishga tushirish
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Namuna env: [backend/.env.example](backend/.env.example)

## Frontend ishga tushirish
```bash
cd frontend
npm install
npm run dev
```

Namuna env: [frontend/.env.example](frontend/.env.example)

## Docker orqali ishga tushirish
```bash
docker compose up --build
```

Qo'shimcha yo'riqnoma: [docs/docker.md](docs/docker.md)

Production Docker varianti ham qo'shilgan:

- `docker-compose.prod.yml`
- `.env.docker.prod.example`

## Muhim endpoint namespace
- Auth: `/api/auth/*`
- Admin: `/api/admin/*`
- Teacher: `/api/teacher/*`
- Student: `/api/student/*`
- Admin hujjat/avatar/detail: `/api/admin/docs/*`, `/api/admin/avatars/*`, `/api/admin/details/*`

## Sifat tekshiruvlari
- Backend test: `cd backend && npm test`
- Frontend lint: `cd frontend && npm run lint`
- Frontend test (Vitest): `cd frontend && npm test`
- Repo baseline: `node tools/repo-baseline.mjs`

## Arxitektura baseline
- [docs/architecture/module-boundaries.md](docs/architecture/module-boundaries.md)
- [docs/architecture/day-1-5-baseline.md](docs/architecture/day-1-5-baseline.md)
- [docs/architecture/payroll-backend-refactor-day-6-10.md](docs/architecture/payroll-backend-refactor-day-6-10.md)
- [docs/architecture/security-ops-hardening-day-25-27.md](docs/architecture/security-ops-hardening-day-25-27.md)

## Release hardening
- [docs/release/release-candidate-runbook.md](docs/release/release-candidate-runbook.md)
- [docs/release/release-candidate-status.md](docs/release/release-candidate-status.md)
- [docs/release/health-checklist.md](docs/release/health-checklist.md)
- [docs/release/docker-prod-smoke.md](docs/release/docker-prod-smoke.md)
- [docs/release/migration-rehearsal.md](docs/release/migration-rehearsal.md)
- [docs/release/rollback-plan.md](docs/release/rollback-plan.md)
- Read-only smoke: `node tools/release-smoke.mjs`

## Eslatma
- `uploads/` gitga kiritilmaydi.
- Admin parol reset endpointi endi `newPassword` qabul qiladi va plain parolni response'da qaytarmaydi.
