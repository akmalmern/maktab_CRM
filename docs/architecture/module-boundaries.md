# Module Boundaries Baseline

Bu hujjat 1-5 kunlik refactorning birinchi natijasi. Maqsad: mavjud monolitni buzmasdan, modul chegaralarini yozib qo'yish va keyingi refactor uchun qat'iy qoida berish.

## Amaldagi arxitektura

- Tur: `modular monolith`
- Amaldagi naqsh: `layered monolith`
- Kuchli tomon:
  - `backend/src/controllers`, `services`, `validators`, `middlewares` ajratilgan
  - `frontend/src/features` yo'nalishi bor
- Zaif tomon:
  - Payroll va Finance use-case'lari yirik fayllarda yig'ilgan
  - Controller/service/query/repository mas'uliyatlari aralashgan
  - Frontendda yirik sahifalar container + view + action logicni bir joyga to'plagan

## Mavjud hotspot fayllar

- `backend/src/services/payroll/payrollService.js` - 4815 qator
- `backend/src/controllers/admin/finance/orchestrators/financeOrchestrator.js` - 2465 qator
- `backend/src/services/attendance/attendanceService.js` - 845 qator
- `frontend/src/features/admin/shared/sections/PayrollSection.jsx` - 2010 qator
- `frontend/src/features/admin/shared/sections/FinanceSection.jsx` - 1303 qator
- `frontend/src/features/admin/shared/AdminWorkspace.jsx` - 726 qator

## Qat'iy modul chegaralari

### Auth
- Mas'uliyat:
  - login
  - refresh session
  - logout
  - me/profile
- Taqiqlanadi:
  - payroll/finance query logikasini auth modulga olib kirish

### Attendance
- Mas'uliyat:
  - davomat yozuvlari
  - attendance report projection
  - teacher attendance write flow
- Taqiqlanadi:
  - payroll hisob-kitob qoidalarini attendance service ichiga ko'mish

### Finance
- Mas'uliyat:
  - student payment commandlari
  - debt/projection
  - summary/list/export
  - tariff/imtiyoz projection
- Taqiqlanadi:
  - frontend filtri yoki response formatting logikasini controller ichida ko'paytirish

### Payroll
- Mas'uliyat:
  - generate
  - approve
  - pay
  - reverse
  - item adjustment
  - payroll automation
- Taqiqlanadi:
  - attendance raw query logikasini payroll use-case ichida ko'paytirish

## Target dependency flow

Qoidalar:

1. `routes -> controllers -> use-cases -> repositories -> prisma`
2. `controllers` faqat request parsing va response mapping bilan shug'ullanadi
3. `use-cases` biznes qoida markazi bo'ladi
4. `repositories` DB accessni kapsulatsiya qiladi
5. `shared` infra (`logger`, `errors`, `request context`, `auth helpers`) uchun ishlatiladi

## Payroll bo'yicha use-case inventory

Ajratilishi kerak bo'lgan birlamchi oqimlar:

- `generatePayrollRun`
- `approvePayrollRun`
- `payPayrollRun`
- `payPayrollItem`
- `reversePayrollRun`
- `recalculatePayrollRunAggregates`
- `runPayrollAutomation`
- `managePayrollAdvance`

## Finance bo'yicha use-case inventory

Ajratilishi kerak bo'lgan birlamchi oqimlar:

- `createPayment`
- `revertPayment`
- `syncStudentMajburiyat`
- `fetchFinanceSummary`
- `fetchFinanceRows`
- `exportDebtors`
- `runMonthlyDebtSync`
- `activateScheduledTariffs`

## Attendance bo'yicha use-case inventory

- `markAttendance`
- `bulkMarkAttendance`
- `buildAttendanceReport`
- `teacherAttendanceScope`
- `attendanceWriteValidation`

## Frontend boundary qoidalari

Har bir feature ichida minimal tuzilma:

- `api/`
- `hooks/`
- `components/`
- `models/`
- `pages/`
- `tests/`

UI qatlamida:

1. `page/container` RTK Query va route state bilan ishlaydi
2. `components` faqat props oladi
3. `models` formatter va derived state uchun ishlatiladi
4. `actions/modals` table komponent ichida emas, alohida qatlamda bo'ladi
