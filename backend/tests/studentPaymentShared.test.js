const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getPaymentRequestInput,
  buildPaymentAllocationPreview,
} = require("../src/controllers/admin/finance/useCases/studentPaymentShared");

test("getPaymentRequestInput body ni normalize qiladi", () => {
  const result = getPaymentRequestInput({
    body: {
      startMonth: "2026-03",
      turi: "IXTIYORIY",
      oylarSoni: "2",
      summa: "150000",
      idempotencyKey: " key-1 ",
    },
    fallbackStartMonth: "2026-02",
  });

  assert.equal(result.startMonth, "2026-03");
  assert.equal(result.turi, "IXTIYORIY");
  assert.equal(result.requestedMonthsRaw, 2);
  assert.equal(result.requestedSumma, 150000);
  assert.equal(result.idempotencyKey, "key-1");
});

test("buildPaymentAllocationPreview oylar bo'yicha qoldiqni to'g'ri taqsimlaydi", async () => {
  const result = await buildPaymentAllocationPreview({
    deps: {
      ApiError: class extends Error {
        constructor(status, code, message, details) {
          super(message);
          this.status = status;
          this.code = code;
          this.details = details;
        }
      },
      resolvePaymentAmount: ({ expectedSumma, requestedSumma }) =>
        requestedSumma ?? expectedSumma,
      safeFormatMonthKey: (value) => value,
      fetchStudentPaymentCoverageRows: async () => [
        { yil: 2026, oy: 3, summa: 50000 },
      ],
    },
    prismaClient: {},
    studentId: "student-1",
    draftPlans: [
      { key: "2026-03", yil: 2026, oy: 3, oySumma: 300000 },
      { key: "2026-04", yil: 2026, oy: 4, oySumma: 300000 },
    ],
    requestedSumma: 400000,
    throwOnAlreadyPaid: false,
  });

  assert.equal(result.expectedSumma, 550000);
  assert.equal(result.finalSumma, 400000);
  assert.equal(result.allocations.length, 2);
  assert.equal(result.allocations[0].qoplamaSumma, 250000);
  assert.equal(result.allocations[1].qoplamaSumma, 150000);
});
