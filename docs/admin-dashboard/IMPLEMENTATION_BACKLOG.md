# Admin Dashboard Implementation Backlog

Bu backlog `PRO_SPEC_AND_API_CONTRACT.md` asosida ketma-ket joriy qilish uchun.

## P0 (1-hafta): Ishlaydigan biznes dashboard

1. Frontend global filter panel
- `periodMonth`, `classroomId`, `search`.
- URL query-sync (`/admin?periodMonth=...&classroomId=...`).

2. KPI qatori
- Finance summary + Payroll monthly reportdan:
  - `reja`, `tushum`, `shu oy qarz`, `qarzdor soni`, `net cashflow`.

3. Drill-down
- KPI kartalar bosilganda:
  - `/admin/moliya` yoki `/admin/oylik` filter bilan ochilsin.

4. Consistency guard
- Agar dashboard summasi bilan detail summasi mos kelmasa `warning badge`.

## P1 (2-hafta): Alert va trend

1. Alert Center
- `DEBT_OVERDUE`, `PAYROLL_PENDING`, `ATTENDANCE_DROP`, `SCHEDULE_GAP`.

2. Trend charts
- 6-oylik `plan vs collected`
- 7-kunlik attendance trend

3. Top lists
- `Top qarzdor sinf`
- `Top qarzdor o'quvchi`

## P2 (3-hafta): BFF endpoint

1. Backend endpoint
- `GET /api/admin/dashboard/overview`
- Response `PRO_SPEC_AND_API_CONTRACT.md` ga to'liq mos.

2. Aggregation optimizatsiya
- Faqat SQL/Prisma aggregation
- In-memory full-collect ishlatilmasin

3. Cache + monitoring
- TTL: 30-60s
- `generatedAt`, `dataVersion`

## P3 (4-hafta): Quality gate

1. Testlar
- Backend integration:
  - `summary/list scope parity`
  - `all classrooms consistency`
  - `net cashflow formula`
- Frontend:
  - filter -> API params parity
  - karta drill-down route test

2. I18n quality
- uz/ru/en key parity lint
- mojibake blokeri

3. CI gate
- backend test
- frontend lint + test
- prisma validate
- i18n check

## Done Definition

- Dashboard kartalari va Finance/Payroll ekranlari orasida raqam farqi yo'q.
- `All classrooms` rejimi buzilmaydi.
- 3 til matnlari to'liq ko'rinadi.
- P95 tezlik maqsadi bajariladi.
