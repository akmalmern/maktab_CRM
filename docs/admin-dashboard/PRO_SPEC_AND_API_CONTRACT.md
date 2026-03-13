# Admin Dashboard: PRO Spec + API Contract

Bu hujjat `Admin Dashboard`ni biznesga foydali, tez va auditga mos qilish uchun aniq texnik spesifikatsiya.

## 1. Maqsad

- Admin uchun 15 soniya ichida holatni tushunish:
  - `Pul oqimi`
  - `Qarz riski`
  - `Oylik (payroll) holati`
  - `Akademik intizom (davomat/dars)`
- Har bir karta aniq formula va drill-down bilan ishlaydi.

## 2. Global Filter Contract (hamma widget uchun bir xil)

- `periodMonth`: `YYYY-MM` (default: joriy oy)
- `classroomId`: `all` yoki aniq `classroomId`
- `search`: ixtiyoriy (ism/username)
- `asOf`: ixtiyoriy `ISO datetime` (audit snapshot uchun)
- `timezone`: default `Asia/Tashkent`

UI qoidasi:
- Filter o'zgarsa barcha widgetlar bitta request context bilan qayta hisoblanadi.
- Headerda har doim:
  - `Tanlangan oy`
  - `Scope: Barcha sinflar / N-sinf`
  - `Oxirgi yangilanish: yyyy-mm-dd hh:mm:ss`

## 3. Dashboard Layout (PRO)

## 3.1. Qator-1: CEO KPI (P0)

1. `Faol o'quvchilar`
2. `Oylik reja`
3. `Amalda tushgan pul`
4. `Shu oy qarz`
5. `Qarzdor o'quvchilar soni`
6. `Sof pul oqimi (tushum - payroll)`

Formula:
- `collectionRate = collectedAmount / planAmount * 100`
- `netCashflow = collectedAmount - payrollPayoutAmount + payrollReversalAmount`

Drill-down:
- Moliya kartalari -> `/admin/moliya`
- Oylik kartalari -> `/admin/oylik`

## 3.2. Finance bloki (P0)

- `Umumiy qarz`
- `Qarz aging`: `0-30`, `31-60`, `60+ kun`
- `Top 10 qarzdor sinf`
- `Top 10 qarzdor o'quvchi`
- `Reja vs Tushum` trend (oy kesimida)

## 3.3. Payroll bloki (P0)

- `To'lanadi`, `To'langan`, `Qoldiq`
- `Payroll completion %`
- `To'lanmagan o'qituvchilar soni`
- `Run status breakdown`: `DRAFT/APPROVED/PAID/REVERSED`

Formula:
- `payrollCompletionRate = paidAmount / payableAmount * 100`

## 3.4. Akademik bloki (P1)

- `Bugungi darslar: reja vs bajarilgan`
- `Almashtirilgan darslar`
- `Bekor qilingan darslar`
- `Davomat: kunlik/haftalik`

## 3.5. Alert Center (P1)

Alert turlari:
- `DEBT_OVERDUE` (qarz 30+ kun)
- `PAYROLL_PENDING` (run APPROVED lekin to'lanmagan)
- `ATTENDANCE_DROP` (haftalik davomat thresholddan past)
- `SCHEDULE_GAP` (bo'sh slot ko'paygan)

Har alertda:
- `severity`: `high | medium | low`
- `count`
- `actionUrl`

## 4. Widget Data Dictionary (aniq maydonlar)

- `activeStudentsCount: number`
- `monthlyPlanAmount: number`
- `collectedAmount: number`
- `thisMonthDebtAmount: number`
- `totalDebtAmount: number`
- `debtorsCount: number`
- `payrollPayableAmount: number`
- `payrollPaidAmount: number`
- `payrollRemainingAmount: number`
- `payrollPayoutAmount: number`
- `payrollReversalAmount: number`
- `netCashflowAmount: number`
- `attendanceDailyPercent: number (0..100)`
- `attendanceWeeklyPercent: number (0..100)`
- `lessonsPlannedToday: number`
- `lessonsDoneToday: number`
- `lessonsReplacedToday: number`
- `lessonsCanceledToday: number`

## 5. Target API Contract (BFF usulida)

## 5.1. Endpoint

`GET /api/admin/dashboard/overview`

Query:
- `periodMonth=YYYY-MM`
- `classroomId=all|<id>`
- `search=<string>`
- `asOf=<isoDatetime>` (optional)

Response:

```json
{
  "ok": true,
  "meta": {
    "periodMonth": "2026-03",
    "timezone": "Asia/Tashkent",
    "scope": {
      "classroomId": "all",
      "classroomLabel": "Barcha sinflar"
    },
    "generatedAt": "2026-03-12T06:20:00.000Z",
    "dataVersion": "dashboard-v1"
  },
  "kpi": {
    "activeStudentsCount": 501,
    "monthlyPlanAmount": 146620000,
    "collectedAmount": 900000000,
    "thisMonthDebtAmount": 300000,
    "debtorsCount": 1,
    "payrollPayoutAmount": 89673750,
    "payrollReversalAmount": 0,
    "netCashflowAmount": 810326250,
    "collectionRate": 613.82
  },
  "finance": {
    "totalDebtAmount": 600000,
    "aging": {
      "d0_30": 300000,
      "d31_60": 300000,
      "d61_plus": 0
    },
    "topDebtorClassrooms": [
      { "classroomId": "c1", "classroom": "10-A (2025-2026)", "debtAmount": 600000, "debtorsCount": 1 }
    ],
    "topDebtors": [
      { "studentId": "s1", "fullName": "Ali Valiyev", "username": "@ali", "classroom": "10-A (2025-2026)", "debtAmount": 600000 }
    ],
    "trend": [
      { "month": "2025-11", "planAmount": 120000000, "collectedAmount": 118000000 },
      { "month": "2025-12", "planAmount": 128000000, "collectedAmount": 129500000 }
    ]
  },
  "payroll": {
    "runStatus": "PAID",
    "teacherCount": 73,
    "payableAmount": 89673750,
    "paidAmount": 89673750,
    "remainingAmount": 0,
    "completionRate": 100
  },
  "academic": {
    "lessonsPlannedToday": 132,
    "lessonsDoneToday": 124,
    "lessonsReplacedToday": 3,
    "lessonsCanceledToday": 5,
    "attendanceDailyPercent": 96.4,
    "attendanceWeeklyPercent": 94.9
  },
  "alerts": [
    {
      "id": "DEBT_OVERDUE_30",
      "severity": "high",
      "title": "30+ kunlik qarzlar mavjud",
      "count": 1,
      "amount": 300000,
      "actionUrl": "/admin/moliya?status=QARZDOR"
    }
  ],
  "quality": {
    "summaryListConsistency": true,
    "schedulerLastRunAt": "2026-03-12T00:01:05.000Z",
    "schedulerFailures24h": 0
  }
}
```

## 5.2. Error Contract

```json
{
  "ok": false,
  "error": {
    "code": "DASHBOARD_BUILD_FAILED",
    "message": "Dashboard ma'lumotlarini yig'ishda xatolik",
    "meta": {
      "periodMonth": "2026-03",
      "classroomId": "all"
    }
  }
}
```

## 6. Mapping: Hozirgi APIlardan qanday yig'iladi

Tez joriy qilish (BFF yozmasdan ham):
- Finance:
  - `GET /api/admin/moliya/students` (`summary` va ro'yxat)
- Payroll:
  - `GET /api/admin/moliya/oylik/reports/monthly`
  - `GET /api/admin/moliya/oylik/runs`
- Attendance:
  - `GET /api/admin/davomat/hisobot`
- Schedule:
  - `GET /api/admin/dars-jadval`
- People/Classroom:
  - `GET /api/admin/teachers`
  - `GET /api/admin/students`
  - `GET /api/admin/classrooms`

Target holat (PRO):
- Bitta BFF endpoint: `/api/admin/dashboard/overview`
- Frontend bitta query bilan barcha kartani render qiladi.

## 7. Performance/SLA

- P95 response:
  - `all classrooms`: `< 700ms`
  - `single classroom`: `< 400ms`
- Cache:
  - dashboard response TTL: `30-60s`
- DB:
  - summarylar faqat aggregation query bilan
  - RAM da full dataset yig'ish taqiqlanadi

## 8. UX Qoidalari

- Har KPI kartada `tooltip`:
  - formula
  - oxirgi yangilanish vaqti
- Raqam format:
  - `44 836 875 so'm`
- Rang semantikasi:
  - yashil: yaxshi
  - sariq: ogohlantirish
  - qizil: kritik
- Har karta bosilganda tegishli sahifaga filter bilan o'tadi.

## 9. Acceptance Criteria (release gate)

- `summary` va `list` scope 100% bir xil.
- `classroom=all` holatida avtomatik birinchi sinfga tushib ketmaydi.
- Dashboarddagi barcha summalar Finance/Payroll bo'limi bilan bir xil chiqadi.
- Export (`xlsx/pdf`) dagi raqamlar dashboard kartalari bilan mos.
- 3 til (UZ/RU/EN) parity check o'tadi.
