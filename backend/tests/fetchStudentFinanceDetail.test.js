const test = require("node:test");
const assert = require("node:assert/strict");
const {
  executeFetchStudentFinanceDetail,
} = require("../src/controllers/admin/finance/useCases/fetchStudentFinanceDetail");

test("executeFetchStudentFinanceDetail student, majburiyat, imtiyoz va transactionlarni map qiladi", async () => {
  const result = await executeFetchStudentFinanceDetail({
    deps: {
      ApiError: class extends Error {
        constructor(status, code, message) {
          super(message);
          this.status = status;
          this.code = code;
        }
      },
      ensureManagerCanAccessStudent: async () => {},
      findStudentFinanceProfile: async () => ({
        id: "student-1",
        firstName: "Ali",
        lastName: "Valiyev",
        user: { username: "ali", phone: "+998" },
        enrollments: [{ classroom: { name: "7-A", academicYear: "2025-2026" } }],
      }),
      fetchStudentFinanceMajburiyatRows: async () => [
        {
          yil: 2026,
          oy: 3,
          bazaSumma: 300000,
          imtiyozSumma: 0,
          netSumma: 300000,
          tolanganSumma: 100000,
          qoldiqSumma: 200000,
          holat: "QISMAN_TOLANGAN",
        },
      ],
      fetchStudentImtiyozRows: async () => [
        { id: "im-1", turi: "FOIZ", qiymat: 10, isActive: true },
      ],
      fetchStudentPaymentTransactions: async () => [
        {
          id: "txn-1",
          turi: "OYLIK",
          holat: "AKTIV",
          summa: 100000,
          tolovSana: "2026-03-10T00:00:00.000Z",
          qoplamalar: [{ yil: 2026, oy: 3, summa: 100000 }],
        },
      ],
      summarizeDebtFromMajburiyatRows: (rows) => ({
        jamiQarz: rows.reduce((sum, row) => sum + Number(row.qoldiqSumma || 0), 0),
      }),
      mapStudentRowFromRaw: (row, debtInfo) => ({
        id: row.id,
        fullName: `${row.firstName} ${row.lastName}`,
        debtInfo,
      }),
      mapImtiyozRow: (row) => ({ ...row, mapped: true }),
      safeFormatMonthKey: (value) => value,
    },
    actor: { role: "ADMIN", sub: "admin-1" },
    studentId: "student-1",
  });

  assert.equal(result.student.fullName, "Ali Valiyev");
  assert.equal(result.student.debtInfo.jamiQarz, 200000);
  assert.equal(result.majburiyatlar[0].oyLabel, "2026-03");
  assert.equal(result.imtiyozlar[0].mapped, true);
  assert.equal(result.transactions[0].qoplanganOylarFormatted[0], "2026-03");
});
