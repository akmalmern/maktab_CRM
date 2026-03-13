# Release Candidate Runbook

## 1. Maqsad
Refactordan keyingi release candidate ni nazorat bilan chiqarish.

## 2. Texnik gate
- backend testlar yashil
- frontend lint/test/i18n check yashil
- migration rehearsal yakunlangan
- Docker/prod smoke yashil

## 3. Smoke testlar
### Kod ichidagi smoke
```bash
cd backend
npm run test:release-smoke
```

Bu oqimlar HTTP qatlamida tekshiriladi:
- login
- finance payment
- payroll generate
- payroll pay
- payroll reverse

### Deploydan keyingi read-only smoke
```bash
set RELEASE_BASE_URL=http://localhost:5000
set MONITORING_TOKEN=replace-with-real-monitoring-token
node tools/release-smoke.mjs
```

## 4. Tavsiya etilgan deploy tartibi
1. `npx prisma migrate deploy`
2. backend deploy
3. frontend deploy
4. read-only smoke
5. biznes smoke
6. monitoring/loglarni 15-30 daqiqa kuzatish

## 5. Kuzatiladigan signal
- `5xx` error soni
- `RATE_LIMIT_STORE_UNAVAILABLE`
- `MONITORING_DISABLED`
- auth failure spike
- payroll/finance audit log yozuvlari

## 6. Agar xato chiqsa
- [rollback-plan.md](./rollback-plan.md) bo'yicha qayting
- root cause va incident vaqtini yozib qo'ying

## 7. Release note uchun yakuniy signal
- `AdminWorkspace` va `FinanceSection` bo'lingan
- i18n static catalog ishlayapti
- finance summary/export oqimlari DB aggregation va batching bilan yurmoqda
- security/monitoring qatlamlari mavjud
