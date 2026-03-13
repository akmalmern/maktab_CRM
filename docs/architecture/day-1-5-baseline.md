# Day 1-5 Baseline

Bu snapshot refactor boshlanishidagi obyektiv holatni fiksatsiya qiladi.

## Kod hajmi

- `backend/src/services/payroll/payrollService.js`: 4815 qator
- `backend/src/controllers/admin/finance/orchestrators/financeOrchestrator.js`: 2465 qator
- `backend/src/services/attendance/attendanceService.js`: 845 qator
- `frontend/src/features/admin/shared/sections/PayrollSection.jsx`: 2010 qator
- `frontend/src/features/admin/shared/sections/FinanceSection.jsx`: 1303 qator
- `frontend/src/features/admin/shared/AdminWorkspace.jsx`: 726 qator

## Asosiy risklar

1. Finance/Payroll use-case'lari bitta faylda yig'ilgan
2. Frontendda admin workspace va payroll section juda katta
3. Runtime logging structured emas edi, request trace yo'q edi
4. Env policy tarqoq edi, `.env.example` yo'q edi

## Day 1-5 deliverable'lar

- request id middleware
- structured JSON logger
- env example fayllari
- root env ignore policy
- architecture/module boundary hujjati
- baseline logger testi

## Qo'lda tekshirish komandalar

Backend:

```bash
cd backend
npm test
npx prisma validate
```

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run i18n:check
```

Repo baseline:

```bash
node tools/repo-baseline.mjs
```
