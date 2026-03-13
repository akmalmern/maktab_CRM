const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");
const XLSX = require("xlsx");
const prisma = require("../src/prisma");
const payrollService = require("../src/services/payroll/payrollService");
const financeOrchestrator = require("../src/controllers/admin/finance/orchestrators/financeOrchestrator");
const {
  executeExportDebtorsXlsx,
} = require("../src/controllers/admin/finance/useCases/exportDebtorsXlsx");

async function runWithStubs(stubs, fn) {
  const restores = stubs.map(({ obj, key, value }) => {
    const previous = obj[key];
    obj[key] = value;
    return () => {
      obj[key] = previous;
    };
  });

  try {
    return await fn();
  } finally {
    for (const restore of restores.reverse()) restore();
  }
}

async function withFixedNow(isoTimestamp, fn) {
  const RealDate = Date;
  const fixedTime = new RealDate(isoTimestamp).getTime();

  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedTime);
      } else {
        super(...args);
      }
    }

    static now() {
      return fixedTime;
    }
  }

  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;

  global.Date = FakeDate;
  try {
    return await fn();
  } finally {
    global.Date = RealDate;
  }
}

function decimalToNumber(value) {
  if (value == null) return 0;
  if (value instanceof Prisma.Decimal) return Number(value.toString());
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  if (value instanceof Prisma.Decimal) return value.toDecimalPlaces(2);
  return new Prisma.Decimal(value || 0).toDecimalPlaces(2);
}

function cloneDate(value) {
  if (!value) return value;
  return new Date(new Date(value).toISOString());
}

function pickFields(row, select) {
  if (!select) return row;
  const result = {};
  for (const [key, config] of Object.entries(select)) {
    if (!config) continue;
    if (config === true) {
      result[key] = row[key];
      continue;
    }
    if (typeof config === "object" && row[key] && typeof row[key] === "object") {
      result[key] = pickFields(row[key], config.select || null);
    }
  }
  return result;
}

function createLockManager() {
  const locked = new Set();
  const waiters = new Map();

  function release(key) {
    const queue = waiters.get(key) || [];
    const next = queue.shift();
    if (next) {
      waiters.set(key, queue);
      next();
      return;
    }
    waiters.delete(key);
    locked.delete(key);
  }

  async function acquire(key) {
    if (!locked.has(key)) {
      locked.add(key);
      return () => release(key);
    }
    await new Promise((resolve) => {
      const queue = waiters.get(key) || [];
      queue.push(resolve);
      waiters.set(key, queue);
    });
    return () => release(key);
  }

  return { acquire };
}

function createPayrollHarness({
  runStatus = "APPROVED",
  items = [],
  payments = [],
  cashEntries = [],
}) {
  const lockManager = createLockManager();
  let sequence = 0;
  const nextId = (prefix) => `${prefix}_${++sequence}`;

  const state = {
    organization: { id: "org_main", key: "MAIN", name: "Asosiy tashkilot" },
    run: {
      id: "run_1",
      organizationId: "org_main",
      periodMonth: "2026-03",
      status: runStatus,
      paymentMethod: null,
      paidAt: null,
      paidByUserId: null,
      paymentNote: null,
      externalRef: null,
      reverseReason: null,
      reversedAt: null,
      reversedByUserId: null,
      approvedAt: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    },
    items: items.map((item) => ({
      id: item.id,
      organizationId: "org_main",
      payrollRunId: "run_1",
      employeeId: item.employeeId || null,
      teacherId: item.teacherId || null,
      payableAmount: money(item.payableAmount || 0),
      paidAmount: money(item.paidAmount || 0),
      paymentStatus: item.paymentStatus || "UNPAID",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    })),
    payments: payments.map((payment) => ({
      id: payment.id || nextId("payment"),
      organizationId: "org_main",
      payrollRunId: "run_1",
      payrollItemId: payment.payrollItemId,
      employeeId: payment.employeeId || null,
      teacherId: payment.teacherId || null,
      amount: money(payment.amount || 0),
      paymentMethod: payment.paymentMethod || "BANK",
      paidAt: cloneDate(payment.paidAt) || new Date("2026-03-05T00:00:00.000Z"),
      externalRef: payment.externalRef || null,
      note: payment.note || null,
      createdByUserId: payment.createdByUserId || "admin_seed",
      createdAt: cloneDate(payment.createdAt) || new Date("2026-03-05T00:00:00.000Z"),
    })),
    cashEntries: cashEntries.map((entry) => ({
      id: entry.id || nextId("cash"),
      organizationId: "org_main",
      payrollRunId: "run_1",
      payrollItemId: entry.payrollItemId || null,
      payrollItemPaymentId: entry.payrollItemPaymentId || null,
      amount: money(entry.amount || 0),
      paymentMethod: entry.paymentMethod || "BANK",
      entryType: entry.entryType || "PAYROLL_PAYOUT",
      occurredAt: cloneDate(entry.occurredAt) || new Date("2026-03-05T00:00:00.000Z"),
      externalRef: entry.externalRef || null,
      note: entry.note || null,
      createdByUserId: entry.createdByUserId || "admin_seed",
      meta: entry.meta || null,
      createdAt: cloneDate(entry.createdAt) || new Date("2026-03-05T00:00:00.000Z"),
    })),
    audits: [],
  };

  function getItemById(itemId) {
    return state.items.find((item) => item.id === itemId) || null;
  }

  function extractRawText(sqlArg) {
    if (Array.isArray(sqlArg) && Object.prototype.hasOwnProperty.call(sqlArg, "raw")) {
      return sqlArg.join(" ? ");
    }
    if (typeof sqlArg === "string") return sqlArg;
    return String(sqlArg || "");
  }

  function buildTx({ txSnapshot, heldLocks, heldLockKeys }) {
    return {
      $executeRaw: async (...args) => {
        const sqlText = extractRawText(args[0]);
        const values = args.slice(1);
        if (!sqlText.includes("FOR UPDATE")) return 1;

        const lockKeys = [];
        if (sqlText.includes('FROM "PayrollRun"')) {
          const runId = values[0];
          lockKeys.push(`run:${runId}`);
        } else if (
          sqlText.includes('FROM "PayrollItem"') &&
          sqlText.includes('WHERE id =')
        ) {
          const itemId = values[0];
          lockKeys.push(`item:${itemId}`);
        } else if (
          sqlText.includes('FROM "PayrollItem"') &&
          sqlText.includes('"payrollRunId"')
        ) {
          const runId = values[0];
          const runItemIds = state.items
            .filter((item) => item.payrollRunId === runId)
            .map((item) => item.id);
          for (const itemId of runItemIds) {
            lockKeys.push(`item:${itemId}`);
          }
        }

        for (const key of lockKeys) {
          if (heldLockKeys.has(key)) continue;
          const release = await lockManager.acquire(key);
          heldLockKeys.add(key);
          heldLocks.push(release);
        }
        return lockKeys.length || 1;
      },
      organization: {
        upsert: async ({ select }) => pickFields({ ...state.organization }, select),
      },
      payrollRun: {
        findFirst: async ({ where }) => {
          if (
            state.run.id === where.id &&
            state.run.organizationId === where.organizationId
          ) {
            return { ...state.run };
          }
          return null;
        },
        update: async ({ where, data }) => {
          if (state.run.id !== where.id) return null;
          state.run = {
            ...state.run,
            ...data,
            updatedAt: new Date(),
          };
          return { ...state.run };
        },
      },
      payrollItem: {
        findFirst: async ({ where, select }) => {
          const liveItem = state.items.find(
            (item) =>
              item.id === where.id &&
              item.payrollRunId === where.payrollRunId &&
              item.organizationId === where.organizationId,
          );
          if (!liveItem) return null;

          const lockKey = `item:${where.id}`;
          const source = heldLockKeys.has(lockKey)
            ? liveItem
            : txSnapshot.itemsById.get(where.id) || liveItem;
          return pickFields({ ...source }, select);
        },
        findMany: async ({ where, select }) =>
          state.items
            .filter((item) => {
              if (where?.payrollRunId && item.payrollRunId !== where.payrollRunId) return false;
              if (where?.organizationId && item.organizationId !== where.organizationId) return false;
              return true;
            })
            .map((item) => pickFields({ ...item }, select)),
        update: async ({ where, data }) => {
          const index = state.items.findIndex((item) => item.id === where.id);
          if (index === -1) return null;
          state.items[index] = {
            ...state.items[index],
            ...data,
            paidAmount:
              data.paidAmount !== undefined ? money(data.paidAmount) : state.items[index].paidAmount,
            updatedAt: new Date(),
          };
          return { ...state.items[index] };
        },
      },
      payrollItemPayment: {
        findMany: async ({ where, select }) =>
          state.payments
            .filter((payment) => {
              if (where?.payrollRunId && payment.payrollRunId !== where.payrollRunId) return false;
              if (where?.organizationId && payment.organizationId !== where.organizationId) return false;
              return true;
            })
            .sort((a, b) => {
              const timeA = new Date(a.paidAt).getTime();
              const timeB = new Date(b.paidAt).getTime();
              if (timeA !== timeB) return timeA - timeB;
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            })
            .map((payment) => pickFields({ ...payment }, select)),
        create: async ({ data }) => {
          const row = {
            id: nextId("payment"),
            organizationId: data.organizationId,
            payrollRunId: data.payrollRunId,
            payrollItemId: data.payrollItemId,
            employeeId: data.employeeId || null,
            teacherId: data.teacherId || null,
            amount: money(data.amount),
            paymentMethod: data.paymentMethod || null,
            paidAt: cloneDate(data.paidAt) || new Date(),
            externalRef: data.externalRef || null,
            note: data.note || null,
            createdByUserId: data.createdByUserId || null,
            createdAt: new Date(),
          };
          state.payments.push(row);
          return { ...row };
        },
      },
      payrollCashEntry: {
        create: async ({ data }) => {
          const row = {
            id: nextId("cash"),
            organizationId: data.organizationId,
            payrollRunId: data.payrollRunId || null,
            payrollItemId: data.payrollItemId || null,
            payrollItemPaymentId: data.payrollItemPaymentId || null,
            amount: money(data.amount),
            paymentMethod: data.paymentMethod || null,
            entryType: data.entryType || "PAYROLL_PAYOUT",
            occurredAt: cloneDate(data.occurredAt) || new Date(),
            externalRef: data.externalRef || null,
            note: data.note || null,
            createdByUserId: data.createdByUserId || null,
            meta: data.meta || null,
            createdAt: new Date(),
          };
          state.cashEntries.push(row);
          return { ...row };
        },
      },
      auditLog: {
        create: async ({ data }) => {
          const row = { id: nextId("audit"), ...data };
          state.audits.push(row);
          return { id: row.id };
        },
      },
    };
  }

  const stubs = [
    {
      obj: prisma,
      key: "$transaction",
      value: async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === "function") {
          const txSnapshot = {
            itemsById: new Map(state.items.map((item) => [item.id, { ...item }])),
          };
          const heldLocks = [];
          const heldLockKeys = new Set();
          try {
            return await arg(
              buildTx({
                txSnapshot,
                heldLocks,
                heldLockKeys,
              }),
            );
          } finally {
            for (const release of heldLocks.reverse()) release();
          }
        }
        throw new Error("Unsupported $transaction argument");
      },
    },
  ];

  return { state, stubs };
}

function extractSqlTextFromQueryRawArgs(args) {
  const [first] = args;
  if (Array.isArray(first) && Object.prototype.hasOwnProperty.call(first, "raw")) {
    return first.join(" ? ");
  }
  if (typeof first === "string") return first;
  return String(first || "");
}

test(
  "integration: parallel payPayrollItem so'rovida faqat bitta payment yoziladi",
  { concurrency: false },
  async () => {
    const harness = createPayrollHarness({
      runStatus: "APPROVED",
      items: [
        {
          id: "item_1",
          employeeId: "employee_1",
          teacherId: "teacher_1",
          payableAmount: 100000,
          paidAmount: 0,
          paymentStatus: "UNPAID",
        },
        {
          id: "item_2",
          employeeId: "employee_2",
          teacherId: "teacher_2",
          payableAmount: 50000,
          paidAmount: 0,
          paymentStatus: "UNPAID",
        },
      ],
    });

    await runWithStubs(harness.stubs, async () => {
      const calls = await Promise.allSettled([
        payrollService.payPayrollItem({
          runId: "run_1",
          itemId: "item_1",
          body: { paymentMethod: "BANK", note: "parallel-a" },
          actorUserId: "admin_1",
          req: {},
        }),
        payrollService.payPayrollItem({
          runId: "run_1",
          itemId: "item_1",
          body: { paymentMethod: "BANK", note: "parallel-b" },
          actorUserId: "admin_2",
          req: {},
        }),
      ]);

      const fulfilled = calls.filter((entry) => entry.status === "fulfilled");
      const rejected = calls.filter((entry) => entry.status === "rejected");

      assert.equal(fulfilled.length, 1);
      assert.equal(rejected.length, 1);
      assert.equal(rejected[0].reason?.code, "PAYROLL_ITEM_ALREADY_PAID");
    });

    assert.equal(harness.state.run.status, "APPROVED");
    assert.equal(harness.state.payments.length, 1);
    assert.equal(harness.state.cashEntries.length, 1);
    assert.equal(decimalToNumber(harness.state.payments[0].amount), 100000);
    assert.equal(decimalToNumber(harness.state.cashEntries[0].amount), -100000);
    assert.equal(
      harness.state.items.find((item) => item.id === "item_1")?.paymentStatus,
      "PAID",
    );
    assert.equal(
      harness.state.items.find((item) => item.id === "item_2")?.paymentStatus,
      "UNPAID",
    );
  },
);

test(
  "integration: reversePayrollRun kompensatsiya payment/cash yozuvlarini yaratadi",
  { concurrency: false },
  async () => {
    const harness = createPayrollHarness({
      runStatus: "PAID",
      items: [
        {
          id: "item_1",
          employeeId: "employee_1",
          teacherId: "teacher_1",
          payableAmount: 100000,
          paidAmount: 100000,
          paymentStatus: "PAID",
        },
        {
          id: "item_2",
          employeeId: "employee_2",
          teacherId: "teacher_2",
          payableAmount: 200000,
          paidAmount: 200000,
          paymentStatus: "PAID",
        },
      ],
      payments: [
        {
          id: "pay_1",
          payrollItemId: "item_1",
          employeeId: "employee_1",
          teacherId: "teacher_1",
          amount: 100000,
          paymentMethod: "BANK",
          paidAt: new Date("2026-03-10T10:00:00.000Z"),
        },
        {
          id: "pay_2",
          payrollItemId: "item_2",
          employeeId: "employee_2",
          teacherId: "teacher_2",
          amount: 200000,
          paymentMethod: "BANK",
          paidAt: new Date("2026-03-10T10:05:00.000Z"),
        },
      ],
      cashEntries: [
        {
          id: "cash_1",
          payrollItemId: "item_1",
          payrollItemPaymentId: "pay_1",
          amount: -100000,
          paymentMethod: "BANK",
          entryType: "PAYROLL_PAYOUT",
        },
        {
          id: "cash_2",
          payrollItemId: "item_2",
          payrollItemPaymentId: "pay_2",
          amount: -200000,
          paymentMethod: "BANK",
          entryType: "PAYROLL_PAYOUT",
        },
      ],
    });

    await runWithStubs(harness.stubs, async () => {
      const result = await payrollService.reversePayrollRun({
        runId: "run_1",
        body: { reason: "Audit correction" },
        actorUserId: "admin_1",
        req: {},
      });

      assert.equal(result.reversedPaymentCount, 2);
      assert.equal(decimalToNumber(result.reversedTotal), 300000);
    });

    assert.equal(harness.state.run.status, "REVERSED");
    assert.equal(harness.state.run.reverseReason, "Audit correction");
    assert.equal(harness.state.payments.length, 4);
    assert.equal(
      harness.state.payments.filter((payment) => decimalToNumber(payment.amount) < 0).length,
      2,
    );
    assert.equal(
      harness.state.cashEntries.filter((entry) => entry.entryType === "PAYROLL_REVERSAL").length,
      2,
    );
    assert.deepEqual(
      harness.state.items.map((item) => item.paymentStatus),
      ["UNPAID", "UNPAID"],
    );
    assert.ok(
      harness.state.audits.some((audit) => audit.action === "PAYROLL_RUN_REVERSE"),
    );
  },
);

test(
  "integration: finance summary va page debtor filtri bo'yicha bir xil scope qaytaradi",
  { concurrency: false },
  async () => {
    await withFixedNow("2026-03-12T08:00:00.000Z", async () => {
      const settings = {
        oylikSumma: 300000,
        yillikSumma: 3000000,
        tolovOylarSoni: 10,
        billingCalendar: {
          academicYear: "2025-2026",
          chargeableMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
        },
      };

      const stubs = [
        {
          obj: prisma,
          key: "$queryRaw",
          value: async (...args) => {
            const sqlText = extractSqlTextFromQueryRawArgs(args);
            if (sqlText.includes('SELECT s.id') && sqlText.includes('FROM "Student" s')) {
              return [{ id: "student_1" }, { id: "student_2" }];
            }
            if (sqlText.includes('COUNT(*)::int AS "totalRows"') && sqlText.includes("FROM filtered")) {
              return [
                {
                  totalRows: 1,
                  totalDebtors: 1,
                  totalDebtAmount: 600000,
                  thisMonthDebtors: 1,
                  previousMonthDebtors: 1,
                  selectedMonthDebtors: 0,
                  thisMonthDebtAmount: 300000,
                  previousMonthDebtAmount: 300000,
                  selectedMonthDebtAmount: 0,
                },
              ];
            }
            if (sqlText.includes('TRIM(CONCAT') && sqlText.includes('ORDER BY "totalDebtAmount" DESC')) {
              return [
                {
                  studentId: "student_1",
                  fullName: "Ali Karimov",
                  username: "student_1",
                  classroomId: "class_10a",
                  classroom: "10-A (2025-2026)",
                  totalDebtAmount: 600000,
                  thisMonthDebtAmount: 300000,
                  previousMonthDebtAmount: 300000,
                  selectedMonthDebtAmount: 0,
                  debtMonths: 2,
                },
              ];
            }
            if (sqlText.includes('COUNT(*)::int AS "debtorCount"') && sqlText.includes('GROUP BY "classroomId"')) {
              return [
                {
                  classroomId: "class_10a",
                  classroom: "10-A (2025-2026)",
                  debtorCount: 1,
                  totalDebtAmount: 600000,
                  thisMonthDebtAmount: 300000,
                  previousMonthDebtAmount: 300000,
                  selectedMonthDebtAmount: 0,
                },
              ];
            }
            if (sqlText.includes('COALESCE(SUM(m."netSumma"), 0)::int AS "monthlyPlanAmount"')) {
              return [{ monthlyPlanAmount: 300000 }];
            }
            if (sqlText.includes('COALESCE(SUM(CASE WHEN t."tolovSana" >=') && sqlText.includes('AS "thisYearPaidAmount"')) {
              return [{ thisMonthPaidAmount: 0, thisYearPaidAmount: 0 }];
            }
            if (sqlText.includes('COUNT(*)::int AS "count"')) {
              return [{ count: 1 }];
            }
            if (sqlText.includes('FROM base b') && sqlText.includes('LIMIT')) {
              return [
                {
                  id: "student_1",
                  firstName: "Ali",
                  lastName: "Karimov",
                  username: "student_1",
                  phone: "+998901112233",
                  classroomName: "10-A",
                  academicYear: "2025-2026",
                  startDate: new Date("2025-09-01T00:00:00.000Z"),
                },
              ];
            }
            throw new Error(`Unexpected $queryRaw SQL in test: ${sqlText}`);
          },
        },
        {
          obj: prisma,
          key: "$transaction",
          value: async (arg) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            if (typeof arg === "function") return arg(prisma);
            throw new Error("Unsupported $transaction argument in finance integration test");
          },
        },
        {
          obj: prisma.studentOyMajburiyat,
          key: "findMany",
          value: async ({ where }) => {
            const ids = where?.studentId?.in || [];
            if (!ids.includes("student_1")) return [];
            return [
              {
                studentId: "student_1",
                yil: 2026,
                oy: 2,
                netSumma: 300000,
                tolanganSumma: 0,
                qoldiqSumma: 300000,
                holat: "BELGILANDI",
              },
              {
                studentId: "student_1",
                yil: 2026,
                oy: 3,
                netSumma: 300000,
                tolanganSumma: 0,
                qoldiqSumma: 300000,
                holat: "BELGILANDI",
              },
            ];
          },
        },
        {
          obj: prisma.organization,
          key: "findUnique",
          value: async () => ({ id: "org_main" }),
        },
        {
          obj: prisma.payrollCashEntry,
          key: "groupBy",
          value: async () => [],
        },
        {
          obj: prisma.student,
          key: "findMany",
          value: async () => [
            {
              id: "student_1",
              createdAt: new Date("2025-09-01T00:00:00.000Z"),
              enrollments: [{ startDate: new Date("2025-09-01T00:00:00.000Z") }],
            },
            {
              id: "student_2",
              createdAt: new Date("2025-09-01T00:00:00.000Z"),
              enrollments: [{ startDate: new Date("2025-09-01T00:00:00.000Z") }],
            },
          ],
        },
        {
          obj: prisma.tolovImtiyozi,
          key: "findMany",
          value: async () => [],
        },
        {
          obj: prisma.tolovTranzaksiya,
          key: "aggregate",
          value: async () => ({
            _sum: { summa: new Prisma.Decimal(0) },
          }),
        },
      ];

      await runWithStubs(stubs, async () => {
        const [pageResult, summary] = await Promise.all([
          financeOrchestrator.fetchFinancePageRows({
            search: "",
            classroomId: null,
            classroomIds: null,
            status: "QARZDOR",
            debtMonth: "ALL",
            debtTargetMonth: null,
            page: 1,
            limit: 20,
            settings,
          }),
          financeOrchestrator.fetchFinanceSummary({
            search: "",
            classroomId: null,
            classroomIds: null,
            status: "QARZDOR",
            debtMonth: "ALL",
            debtTargetMonth: null,
            cashflowMonth: null,
            settings,
          }),
        ]);

        assert.equal(pageResult.total, 1);
        assert.equal(pageResult.items.length, 1);
        assert.equal(pageResult.items[0].id, "student_1");
        assert.equal(pageResult.items[0].jamiQarzSumma, 600000);

        assert.equal(summary.totalRows, 1);
        assert.equal(summary.totalDebtors, 1);
        assert.equal(summary.totalDebtAmount, 600000);
        assert.equal(summary.thisMonthDebtAmount, 300000);
        assert.equal(summary.previousMonthDebtAmount, 300000);
      });
    });
  },
);

test("integration: finance debtor xlsx export batched rows bilan bir xil ma'lumot qaytaradi", async () => {
  const result = await executeExportDebtorsXlsx({
    deps: {
      processFinanceRowsInBatches: async ({ onBatch }) => {
        await onBatch([
          {
            fullName: "Ali Karimov",
            username: "student_1",
            classroom: "10-A (2025-2026)",
            qarzOylarSoni: 2,
            qarzOylarFormatted: ["2026-02", "2026-03"],
            jamiQarzSumma: 600000,
          },
        ]);
        await onBatch([
          {
            fullName: "Vali Toshpulatov",
            username: "student_2",
            classroom: "10-B (2025-2026)",
            qarzOylarSoni: 1,
            qarzOylarFormatted: ["2026-03"],
            jamiQarzSumma: 300000,
          },
        ]);
      },
    },
    search: "",
    classroomId: null,
    classroomIds: null,
  });

  assert.equal(result.rowCount, 2);
  const workbook = XLSX.read(result.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  assert.deepEqual(rows, [
    {
      Oquvchi: "Ali Karimov",
      Username: "student_1",
      Sinf: "10-A (2025-2026)",
      QarzOylarSoni: 2,
      QarzOylar: "2026-02, 2026-03",
      JamiQarzSom: 600000,
    },
    {
      Oquvchi: "Vali Toshpulatov",
      Username: "student_2",
      Sinf: "10-B (2025-2026)",
      QarzOylarSoni: 1,
      QarzOylar: "2026-03",
      JamiQarzSom: 300000,
    },
  ]);
});
