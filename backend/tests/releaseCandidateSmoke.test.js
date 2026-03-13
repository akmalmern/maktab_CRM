const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const bcrypt = require("bcrypt");
const prisma = require("../src/prisma");
const payrollService = require("../src/services/payroll/payrollService");
const financeOrchestrator = require("../src/controllers/admin/finance/orchestrators/financeOrchestrator");

const APP_MODULES_TO_CLEAR = [
  "../src/app",
  "../src/routes/adminRoutes",
  "../src/controllers/admin/financeController",
  "../src/controllers/admin/finance/index",
  "../src/controllers/admin/finance/handlers/index",
  "../src/controllers/admin/finance/handlers/commandHandlers",
  "../src/controllers/admin/finance/handlers/queryHandlers",
  "../src/controllers/admin/finance/orchestrators/financeCommandOrchestrator",
  "../src/controllers/admin/finance/orchestrators/financeQueryOrchestrator",
];

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // module hali yuklanmagan bo'lishi mumkin
  }
}

function loadFreshApp() {
  APP_MODULES_TO_CLEAR.forEach(clearModule);
  return require("../src/app");
}

async function withServer(app, fn) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port =
    typeof address === "object" && address
      ? address.port
      : Number.parseInt(String(address || "").split(":").pop(), 10);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

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
    APP_MODULES_TO_CLEAR.forEach(clearModule);
  }
}

function jsonHeaders(token = null) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

test(
  "release smoke: login, finance payment, payroll generate/pay/reverse HTTP flow ishlaydi",
  { concurrency: false },
  async () => {
    const adminUser = {
      id: "ckgv6m6l20000y4y1n6f1a2aa",
      username: "superadmin",
      password: "$2b$10$releaseSmokeHashPlaceholder",
      role: "ADMIN",
      isActive: true,
      phone: "+998901112233",
    };
    const studentId = "ckgv6m6l20000y4y1n6f1a2b3";
    const payrollRunId = "ckh7x7x7x0001qv0h0w0w0w0w";

    await runWithStubs(
      [
        {
          obj: prisma.user,
          key: "findUnique",
          value: async ({ where, select }) => {
            if (where?.username === adminUser.username) {
              return {
                ...adminUser,
              };
            }
            if (where?.id === adminUser.id) {
              const profile = {
                id: adminUser.id,
                role: adminUser.role,
                username: adminUser.username,
                phone: adminUser.phone,
                isActive: true,
                admin: {
                  firstName: "Super",
                  lastName: "Admin",
                  avatarPath: null,
                },
                teacher: null,
                student: null,
              };
              return select ? profile : profile;
            }
            return null;
          },
        },
        {
          obj: bcrypt,
          key: "compare",
          value: async () => true,
        },
        {
          obj: prisma.refreshSession,
          key: "create",
          value: async ({ data }) => ({ id: "session_release_smoke", ...data }),
        },
        {
          obj: prisma.organization,
          key: "upsert",
          value: async () => ({ id: "org_main" }),
        },
        {
          obj: prisma.auditLog,
          key: "create",
          value: async ({ data }) => ({ id: "audit_release_smoke", ...data }),
        },
        {
          obj: financeOrchestrator,
          key: "createStudentPayment",
          value: async (req, res) => {
            res.status(201).json({
              ok: true,
              transaction: {
                id: "txn_release_smoke",
                studentId: req.params.studentId,
                summa: 300000,
                holat: "AKTIV",
              },
              coveredMonths: ["2026-03"],
            });
          },
        },
        {
          obj: payrollService,
          key: "generatePayrollRun",
          value: async ({ body }) => ({
            run: {
              id: payrollRunId,
              periodMonth: body.periodMonth,
              status: "DRAFT",
            },
            generation: { lessonsProcessed: 42 },
          }),
        },
        {
          obj: payrollService,
          key: "payPayrollRun",
          value: async ({ runId, body }) => ({
            run: {
              id: runId,
              status: "PAID",
              paymentMethod: body.paymentMethod,
            },
            paidTotal: 44836875,
          }),
        },
        {
          obj: payrollService,
          key: "reversePayrollRun",
          value: async ({ runId, body }) => ({
            run: {
              id: runId,
              status: "REVERSED",
            },
            reversedPaymentCount: 39,
            reverseReason: body.reason,
          }),
        },
      ],
      async () => {
        const app = loadFreshApp();

        await withServer(app, async (baseUrl) => {
          const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: jsonHeaders(),
            body: JSON.stringify({
              username: adminUser.username,
              password: "secret-password",
            }),
          });
          const loginBody = await loginRes.json();

          assert.equal(loginRes.status, 200);
          assert.equal(loginBody.ok, true);
          assert.equal(loginBody.role, "ADMIN");
          assert.ok(loginBody.accessToken);
          assert.match(loginRes.headers.get("set-cookie") || "", /refreshToken=/);

          const accessToken = loginBody.accessToken;

          const meRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const meBody = await meRes.json();

          assert.equal(meRes.status, 200);
          assert.equal(meBody.user?.username, adminUser.username);

          const financeRes = await fetch(
            `${baseUrl}/api/admin/moliya/students/${studentId}/tolov`,
            {
              method: "POST",
              headers: jsonHeaders(accessToken),
              body: JSON.stringify({
                turi: "OYLIK",
                startMonth: "2026-03",
                oylarSoni: 1,
                izoh: "release smoke payment",
              }),
            },
          );
          const financeBody = await financeRes.json();

          assert.equal(financeRes.status, 201);
          assert.equal(financeBody.ok, true);
          assert.equal(financeBody.transaction?.id, "txn_release_smoke");
          assert.deepEqual(financeBody.coveredMonths, ["2026-03"]);

          const generateRes = await fetch(`${baseUrl}/api/admin/moliya/oylik/runs/generate`, {
            method: "POST",
            headers: jsonHeaders(accessToken),
            body: JSON.stringify({ periodMonth: "2026-03" }),
          });
          const generateBody = await generateRes.json();

          assert.equal(generateRes.status, 200);
          assert.equal(generateBody.ok, true);
          assert.equal(generateBody.run?.status, "DRAFT");
          assert.equal(generateBody.generation?.lessonsProcessed, 42);

          const payRes = await fetch(
            `${baseUrl}/api/admin/moliya/oylik/runs/${payrollRunId}/pay`,
            {
              method: "POST",
              headers: jsonHeaders(accessToken),
              body: JSON.stringify({
                paymentMethod: "BANK",
                note: "release smoke payout",
              }),
            },
          );
          const payBody = await payRes.json();

          assert.equal(payRes.status, 200);
          assert.equal(payBody.ok, true);
          assert.equal(payBody.run?.status, "PAID");
          assert.equal(payBody.paidTotal, 44836875);

          const reverseRes = await fetch(
            `${baseUrl}/api/admin/moliya/oylik/runs/${payrollRunId}/reverse`,
            {
              method: "POST",
              headers: jsonHeaders(accessToken),
              body: JSON.stringify({
                reason: "release smoke rollback",
              }),
            },
          );
          const reverseBody = await reverseRes.json();

          assert.equal(reverseRes.status, 200);
          assert.equal(reverseBody.ok, true);
          assert.equal(reverseBody.run?.status, "REVERSED");
          assert.equal(reverseBody.reversedPaymentCount, 39);
          assert.equal(reverseBody.reverseReason, "release smoke rollback");
        });
      },
    );
  },
);
