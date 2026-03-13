# Finance Backend Refactor Day 11-15

## Scope

Bu bosqichda `financeOrchestrator` va `financeMajburiyatService` ichidagi eng og'ir oqimlar alohida qatlamlarga ajratildi:

- `summary`
- `list/page rows`
- `batch processing`
- `debtor xlsx export`
- `debtor pdf export`
- `majburiyat sync`

## Yangi qatlamlar

### Repository

- `backend/src/controllers/admin/finance/repositories/financeDebtRepository.js`

DB aggregation va filtered debt scope SQL shu faylga ko'chirildi.

Ajratilgan querylar:

- `fetchFinanceSummaryAggregate`
- `fetchFinanceTopDebtors`
- `fetchFinanceTopDebtorClassrooms`
- `fetchFilteredMonthlyPlanAggregate`
- `fetchFilteredPaidAmounts`

### Use cases

- `backend/src/controllers/admin/finance/useCases/fetchFinancePageRows.js`
- `backend/src/controllers/admin/finance/useCases/processFinanceRowsInBatches.js`
- `backend/src/controllers/admin/finance/useCases/fetchFinanceSummary.js`
- `backend/src/controllers/admin/finance/useCases/exportDebtorsXlsx.js`
- `backend/src/controllers/admin/finance/useCases/exportDebtorsPdf.js`

## Nima o'zgardi

### 1. Summary DB aggregationga tushirildi

Oldin:

- student scope olinardi
- debt rows JS ichida reduce/filter qilinardi
- top debtor va classroom grouping JS ichida qurilardi

Hozir:

- summary count/sum SQL aggregationda
- top debtorlar SQL order/limit bilan
- top debtor classrooms SQL group by bilan
- paid amounts filtered scope bo'yicha SQL orqali olinadi

### 2. Export RAM yig'ishdan batch modelga o'tdi

Oldin:

- debtor rows to'liq xotiraga olinardi
- keyin xlsx/pdf build qilinardi

Hozir:

- `processFinanceRowsInBatches` orqali sahifalab olinadi
- XLSX sheet batchma-batch append qilinadi
- PDF stream/batch yoziladi

Bu katta datasetlarda memory pressure ni kamaytiradi.

### 3. Majburiyat sync incremental bo'ldi

Oldin:

- `studentIds` bo'yicha barcha `StudentOyMajburiyat` yozuvlari `deleteMany`
- keyin barcha yozuvlar qayta `createMany`

Hozir:

- desired rows hisoblanadi
- existing rows olinadi
- stale rows `deleteMany(id in ...)`
- missing rows `createMany`
- changed rows `update`
- unchanged rows tegilmaydi

Bu write amplification ni kamaytiradi va audit jihatdan ancha toza.

## Test qamrovi

Yangilangan testlar:

- `backend/tests/financeMajburiyatService.test.js`
  - incremental create/update/delete diff
  - unchanged no-op

- `backend/tests/payrollFinanceIntegration.test.js`
  - finance summary va page debtor scope consistency
  - batched xlsx export consistency

## Verification

Tekshiruvlar:

- `node --test --test-isolation=none tests/*.test.js`
- `npx prisma validate`
- `node tools/repo-baseline.mjs`

## Qolgan ishlar

Keyingi refactor uchun qoladigan asosiy bloklar:

- finance controller handlerlarini yanada maydalash
- cashflow plan calculationni alohida use-case/repository ga ajratish
- manager scoped finance endpoints uchun explicit auth/query tests ko'paytirish
- export uchun true stream-to-disk yoki HTTP chunked strategy ko'rib chiqish
