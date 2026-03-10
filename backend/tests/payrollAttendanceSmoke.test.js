const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");
const prisma = require("../src/prisma");
const { saveTeacherDarsDavomatiByUserId } = require("../src/services/attendance/attendanceWriteService");
const { refreshDraftPayrollForLesson } = require("../src/services/payroll/payrollService");

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

function buildFlowHarness({
  lessonCount = 24,
  ratePerHour = 100000,
  sana = "2026-03-10",
  haftaKuni = "SESHANBA",
}) {
  let sequence = 0;
  const nextId = (prefix) => `${prefix}_${++sequence}`;
  const zero = new Prisma.Decimal(0);
  const periodMonth = sana.slice(0, 7);

  const state = {
    organization: { id: "org_main", key: "MAIN", name: "Asosiy tashkilot" },
    teachers: [
      {
        id: "teacher_1",
        userId: "user_teacher_1",
        employeeId: null,
        subjectId: "subject_1",
        firstName: "Ali",
        lastName: "Karimov",
        user: {
          id: "user_teacher_1",
          username: "ali.karimov",
          isActive: true,
          role: "TEACHER",
        },
      },
    ],
    employees: [],
    darslar: Array.from({ length: lessonCount }, (_, index) => ({
      id: `dars_${index + 1}`,
      sinfId: "class_1",
      fanId: "subject_1",
      oqituvchiId: "teacher_1",
      haftaKuni,
      vaqtOraliq: { boshlanishVaqti: "08:00", tugashVaqti: "09:00" },
    })),
    enrollments: [{ classroomId: "class_1", studentId: "student_1", isActive: true }],
    teacherRates: [
      {
        id: "rate_1",
        organizationId: "org_main",
        teacherId: "teacher_1",
        subjectId: "subject_1",
        ratePerHour: new Prisma.Decimal(ratePerHour),
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        effectiveTo: null,
      },
    ],
    subjectDefaultRates: [],
    davomatlar: [],
    baholar: [],
    realLessons: [],
    payrollRuns: [],
    payrollItems: [],
    payrollLines: [],
    auditLogs: [],
  };

  function getTeacherById(id) {
    return state.teachers.find((row) => row.id === id) || null;
  }

  function getTeacherByUserId(userId) {
    return state.teachers.find((row) => row.userId === userId) || null;
  }

  function getEmployeeById(id) {
    return state.employees.find((row) => row.id === id) || null;
  }

  function getEmployeeByUserId(userId) {
    return state.employees.find((row) => row.userId === userId) || null;
  }

  function attachEmployee(teacher) {
    const employee = teacher?.employeeId ? getEmployeeById(teacher.employeeId) : null;
    if (!employee) return null;
    return {
      ...employee,
      user: employee.user ? { ...employee.user } : null,
      teacher: state.teachers.find((row) => row.employeeId === employee.id) || null,
    };
  }

  function teacherPayload(teacher) {
    if (!teacher) return null;
    return {
      id: teacher.id,
      userId: teacher.userId,
      employeeId: teacher.employeeId || null,
      subjectId: teacher.subjectId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      user: teacher.user ? { ...teacher.user } : null,
      employee: attachEmployee(teacher),
    };
  }

  function buildTx() {
    return {
      $executeRaw: async () => 1,
      organization: {
        upsert: async ({ select }) => pickFields({ ...state.organization }, select),
      },
      davomat: {
        findMany: async ({ where, select }) => {
          const rows = state.davomatlar.filter((row) => {
            if (where?.darsJadvaliId && row.darsJadvaliId !== where.darsJadvaliId) return false;
            if (where?.sana && row.sana.getTime() !== new Date(where.sana).getTime()) return false;
            if (where?.studentId?.in && !where.studentId.in.includes(row.studentId)) return false;
            return true;
          });
          return rows.map((row) => pickFields({ ...row }, select));
        },
        createMany: async ({ data }) => {
          for (const row of data || []) {
            state.davomatlar.push({
              id: nextId("davomat"),
              ...row,
              sana: cloneDate(row.sana),
            });
          }
          return { count: (data || []).length };
        },
        update: async ({ where, data }) => {
          const index = state.davomatlar.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          state.davomatlar[index] = {
            ...state.davomatlar[index],
            ...data,
          };
          return { ...state.davomatlar[index] };
        },
      },
      baho: {
        findMany: async ({ where, select }) => {
          const rows = state.baholar.filter((row) => {
            if (where?.darsJadvaliId && row.darsJadvaliId !== where.darsJadvaliId) return false;
            if (where?.sana && row.sana.getTime() !== new Date(where.sana).getTime()) return false;
            if (where?.studentId?.in && !where.studentId.in.includes(row.studentId)) return false;
            return true;
          });
          return rows.map((row) => pickFields({ ...row }, select));
        },
        createMany: async ({ data }) => {
          for (const row of data || []) {
            state.baholar.push({
              id: nextId("baho"),
              ...row,
              sana: cloneDate(row.sana),
            });
          }
          return { count: (data || []).length };
        },
        deleteMany: async ({ where }) => {
          const before = state.baholar.length;
          state.baholar = state.baholar.filter((row) => !where.id.in.includes(row.id));
          return { count: before - state.baholar.length };
        },
        update: async ({ where, data }) => {
          const index = state.baholar.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          state.baholar[index] = {
            ...state.baholar[index],
            ...data,
          };
          return { ...state.baholar[index] };
        },
      },
      realLesson: {
        findFirst: async ({ where, select }) => {
          const row = state.realLessons.find((item) => {
            if (where?.id && item.id !== where.id) return false;
            if (where?.organizationId && item.organizationId !== where.organizationId) return false;
            if (where?.darsJadvaliId && item.darsJadvaliId !== where.darsJadvaliId) return false;
            if (where?.startAt && item.startAt.getTime() !== new Date(where.startAt).getTime()) return false;
            return true;
          });
          if (!row) return null;
          const teacher = getTeacherById(row.teacherId);
          const payload = {
            ...row,
            teacher: teacher ? { userId: teacher.userId } : null,
            payrollLines: state.payrollLines
              .filter((line) => line.realLessonId === row.id)
              .slice(0, select?.payrollLines?.take || undefined)
              .map((line) => pickFields(line, select?.payrollLines?.select || { id: true })),
          };
          return pickFields(payload, select);
        },
        create: async ({ data, select }) => {
          const row = {
            id: nextId("lesson"),
            createdAt: new Date(),
            ...data,
            startAt: cloneDate(data.startAt),
            endAt: cloneDate(data.endAt),
          };
          state.realLessons.push(row);
          return pickFields({ ...row }, select);
        },
        update: async ({ where, data, select }) => {
          const index = state.realLessons.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          state.realLessons[index] = {
            ...state.realLessons[index],
            ...data,
            ...(data.startAt ? { startAt: cloneDate(data.startAt) } : {}),
            ...(data.endAt ? { endAt: cloneDate(data.endAt) } : {}),
          };
          return pickFields({ ...state.realLessons[index] }, select);
        },
      },
      teacherRate: {
        findMany: async ({ where }) => {
          const periodEnd = where.effectiveFrom?.lt ? new Date(where.effectiveFrom.lt) : null;
          const periodStart = where.OR?.find((item) => item.effectiveTo?.gt)?.effectiveTo?.gt
            ? new Date(where.OR.find((item) => item.effectiveTo?.gt).effectiveTo.gt)
            : null;
          return state.teacherRates
            .filter((row) => {
              if (row.organizationId !== where.organizationId) return false;
              if (where.teacherId?.in && !where.teacherId.in.includes(row.teacherId)) return false;
              if (where.subjectId?.in && !where.subjectId.in.includes(row.subjectId)) return false;
              if (periodEnd && new Date(row.effectiveFrom) >= periodEnd) return false;
              if (
                periodStart &&
                row.effectiveTo &&
                new Date(row.effectiveTo).getTime() <= periodStart.getTime()
              ) {
                return false;
              }
              return true;
            })
            .map((row) => ({ ...row }))
            .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
        },
      },
      subjectDefaultRate: {
        findMany: async () => state.subjectDefaultRates.map((row) => ({ ...row })),
      },
      teacher: {
        findUnique: async ({ where }) => {
          const teacher = where?.id ? getTeacherById(where.id) : getTeacherByUserId(where?.userId);
          return teacherPayload(teacher);
        },
        update: async ({ where, data }) => {
          const index = state.teachers.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          state.teachers[index] = { ...state.teachers[index], ...data };
          return teacherPayload(state.teachers[index]);
        },
      },
      employee: {
        findUnique: async ({ where }) => {
          const row = where?.id ? getEmployeeById(where.id) : getEmployeeByUserId(where?.userId);
          if (!row) return null;
          return {
            ...row,
            user: row.user ? { ...row.user } : null,
          };
        },
        findFirst: async ({ where }) => {
          const row = state.employees.find(
            (item) =>
              item.id === where.id &&
              item.organizationId === where.organizationId,
          );
          if (!row) return null;
          const teacher = state.teachers.find((item) => item.employeeId === row.id) || null;
          return {
            ...row,
            user: row.user ? { ...row.user } : null,
            teacher: teacher
              ? {
                  id: teacher.id,
                  firstName: teacher.firstName,
                  lastName: teacher.lastName,
                }
              : null,
          };
        },
        create: async ({ data }) => {
          const row = {
            id: nextId("employee"),
            createdAt: new Date(),
            ...data,
            user: state.teachers.find((item) => item.userId === data.userId)?.user || null,
          };
          state.employees.push(row);
          return {
            ...row,
            user: row.user ? { ...row.user } : null,
          };
        },
        update: async ({ where, data }) => {
          const index = state.employees.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          state.employees[index] = {
            ...state.employees[index],
            ...data,
          };
          return {
            ...state.employees[index],
            user: state.employees[index].user ? { ...state.employees[index].user } : null,
          };
        },
      },
      payrollRun: {
        findMany: async ({ where }) =>
          state.payrollRuns
            .filter((row) => {
              if (where?.organizationId && row.organizationId !== where.organizationId) return false;
              if (where?.periodMonth && row.periodMonth !== where.periodMonth) return false;
              if (where?.status?.in && !where.status.in.includes(row.status)) return false;
              return true;
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((row) => ({ ...row })),
        findUnique: async ({ where, select }) => {
          const row = state.payrollRuns.find((item) => item.id === where.id);
          if (!row) return null;
          return pickFields({ ...row }, select);
        },
        create: async ({ data }) => {
          const row = {
            id: nextId("run"),
            createdAt: new Date(),
            updatedAt: new Date(),
            calcVersion: 1,
            generatedAt: null,
            sourceLessonsCount: 0,
            teacherCount: 0,
            grossAmount: zero,
            adjustmentAmount: zero,
            payableAmount: zero,
            ...data,
          };
          state.payrollRuns.push(row);
          return { ...row };
        },
        update: async ({ where, data }) => {
          const index = state.payrollRuns.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          const current = state.payrollRuns[index];
          const patch = { ...data };
          if (patch.calcVersion?.increment) {
            patch.calcVersion = Number(current.calcVersion || 0) + Number(patch.calcVersion.increment);
          }
          state.payrollRuns[index] = {
            ...current,
            ...patch,
            updatedAt: new Date(),
          };
          return { ...state.payrollRuns[index] };
        },
      },
      payrollLine: {
        findFirst: async ({ where, select }) => {
          const row = state.payrollLines.find(
            (item) =>
              item.payrollRunId === where.payrollRunId &&
              item.realLessonId === where.realLessonId,
          );
          if (!row) return null;
          return pickFields({ ...row }, select);
        },
        create: async ({ data }) => {
          const row = {
            id: nextId("line"),
            createdAt: new Date(),
            ...data,
          };
          state.payrollLines.push(row);
          return { ...row };
        },
        delete: async ({ where }) => {
          state.payrollLines = state.payrollLines.filter((row) => row.id !== where.id);
          return { id: where.id };
        },
        findMany: async ({ where, include }) =>
          state.payrollLines
            .filter((row) => {
              if (where?.payrollRunId && row.payrollRunId !== where.payrollRunId) return false;
              return true;
            })
            .map((row) => {
              const payload = { ...row };
              if (include?.employee) {
                const employee = getEmployeeById(row.employeeId);
                payload.employee = employee
                  ? {
                      firstName: employee.firstName || null,
                      lastName: employee.lastName || null,
                      user: employee.user ? { username: employee.user.username } : null,
                    }
                  : null;
              }
              if (include?.teacher) {
                const teacher = getTeacherById(row.teacherId);
                payload.teacher = teacher
                  ? {
                      firstName: teacher.firstName || null,
                      lastName: teacher.lastName || null,
                      user: teacher.user ? { username: teacher.user.username } : null,
                    }
                  : null;
              }
              return payload;
            }),
      },
      payrollItem: {
        findUnique: async ({ where, select }) => {
          let row = null;
          if (where.payrollRunId_employeeId) {
            row = state.payrollItems.find(
              (item) =>
                item.payrollRunId === where.payrollRunId_employeeId.payrollRunId &&
                item.employeeId === where.payrollRunId_employeeId.employeeId,
            );
          }
          if (!row && where.payrollRunId_teacherId) {
            row = state.payrollItems.find(
              (item) =>
                item.payrollRunId === where.payrollRunId_teacherId.payrollRunId &&
                item.teacherId === where.payrollRunId_teacherId.teacherId,
            );
          }
          if (!row) return null;
          return pickFields({ ...row }, select);
        },
        create: async ({ data, select }) => {
          const row = {
            id: nextId("item"),
            createdAt: new Date(),
            updatedAt: new Date(),
            totalMinutes: 0,
            totalHours: zero,
            grossAmount: zero,
            bonusAmount: zero,
            penaltyAmount: zero,
            manualAmount: zero,
            adjustmentAmount: zero,
            payableAmount: zero,
            lessonLineCount: 0,
            lineCount: 0,
            ...data,
          };
          state.payrollItems.push(row);
          return pickFields({ ...row }, select);
        },
        update: async ({ where, data, select }) => {
          const index = state.payrollItems.findIndex((row) => row.id === where.id);
          if (index === -1) return null;
          state.payrollItems[index] = {
            ...state.payrollItems[index],
            ...data,
            updatedAt: new Date(),
          };
          return pickFields({ ...state.payrollItems[index] }, select);
        },
        findMany: async ({ where, select }) =>
          state.payrollItems
            .filter((row) => {
              if (where?.payrollRunId && row.payrollRunId !== where.payrollRunId) return false;
              return true;
            })
            .map((row) => pickFields({ ...row }, select)),
        deleteMany: async ({ where }) => {
          const before = state.payrollItems.length;
          state.payrollItems = state.payrollItems.filter((row) => {
            if (row.payrollRunId !== where.payrollRunId) return true;
            if (!where.id?.notIn) return false;
            return where.id.notIn.includes(row.id);
          });
          return { count: before - state.payrollItems.length };
        },
      },
      auditLog: {
        create: async ({ data }) => {
          state.auditLogs.push({ id: nextId("audit"), ...data });
          return { id: state.auditLogs[state.auditLogs.length - 1].id };
        },
      },
    };
  }

  const stubs = [
    {
      obj: prisma.teacher,
      key: "findUnique",
      value: async ({ where }) => {
        const teacher = where?.id ? getTeacherById(where.id) : getTeacherByUserId(where?.userId);
        return teacher
          ? {
              id: teacher.id,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
            }
          : null;
      },
    },
    {
      obj: prisma.darsJadvali,
      key: "findFirst",
      value: async ({ where }) => {
        const row = state.darslar.find(
          (item) =>
            item.id === where.id &&
            item.oqituvchiId === where.oqituvchiId,
        );
        if (!row) return null;
        return {
          id: row.id,
          sinfId: row.sinfId,
          fanId: row.fanId,
          oqituvchiId: row.oqituvchiId,
          haftaKuni: row.haftaKuni,
          vaqtOraliq: {
            boshlanishVaqti: row.vaqtOraliq.boshlanishVaqti,
            tugashVaqti: row.vaqtOraliq.tugashVaqti,
          },
        };
      },
    },
    {
      obj: prisma.enrollment,
      key: "findMany",
      value: async ({ where }) =>
        state.enrollments
          .filter(
            (row) =>
              row.classroomId === where.classroomId &&
              row.isActive === where.isActive,
          )
          .map((row) => ({ studentId: row.studentId })),
    },
    {
      obj: prisma,
      key: "$transaction",
      value: async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === "function") {
          return arg(buildTx());
        }
        throw new Error("Unsupported $transaction argument in smoke test");
      },
    },
  ];

  return { state, stubs, sana, periodMonth };
}

test(
  "smoke: 24 soat dars attendance -> payroll auto hisoblanadi",
  { concurrency: false },
  async () => {
    await withFixedNow("2026-03-10T09:00:00.000Z", async () => {
      const hourlyRate = 100000;
      const lessonCount = 24;
      const harness = buildFlowHarness({
        lessonCount,
        ratePerHour: hourlyRate,
        sana: "2026-03-10",
        haftaKuni: "SESHANBA",
      });

      await runWithStubs(harness.stubs, async () => {
        for (let index = 1; index <= lessonCount; index += 1) {
          const result = await saveTeacherDarsDavomatiByUserId({
            userId: "user_teacher_1",
            darsId: `dars_${index}`,
            body: {
              sana: harness.sana,
              davomatlar: [{ studentId: "student_1", holat: "KELDI" }],
            },
          });
          assert.equal(result.count, 1);
          assert.equal(result.payrollAutoRun?.refreshed, true);
          assert.equal(result.payrollAutoRun?.skipped, false);
        }
      });

      assert.equal(harness.state.realLessons.length, lessonCount);
      assert.equal(harness.state.payrollRuns.length, 1);
      assert.equal(harness.state.payrollItems.length, 1);
      assert.equal(harness.state.payrollLines.length, lessonCount);

      const run = harness.state.payrollRuns[0];
      const item = harness.state.payrollItems[0];
      const expectedAmount = lessonCount * hourlyRate;

      assert.equal(run.status, "DRAFT");
      assert.equal(run.periodMonth, harness.periodMonth);
      assert.equal(run.sourceLessonsCount, lessonCount);
      assert.equal(run.teacherCount, 1);
      assert.equal(decimalToNumber(run.grossAmount), expectedAmount);
      assert.equal(decimalToNumber(run.payableAmount), expectedAmount);

      assert.equal(item.lessonLineCount, lessonCount);
      assert.equal(item.lineCount, lessonCount);
      assert.equal(item.totalMinutes, lessonCount * 60);
      assert.equal(decimalToNumber(item.totalHours), 24);
      assert.equal(decimalToNumber(item.grossAmount), expectedAmount);
      assert.equal(decimalToNumber(item.payableAmount), expectedAmount);

      const lineTotal = harness.state.payrollLines.reduce(
        (acc, row) => acc + decimalToNumber(row.amount),
        0,
      );
      assert.equal(lineTotal, expectedAmount);
    });
  },
);

test(
  "smoke: REPLACED dars replacement teacher rate bilan hisoblanadi",
  { concurrency: false },
  async () => {
    await withFixedNow("2026-03-10T09:00:00.000Z", async () => {
      const replacementRate = 120000;
      const harness = buildFlowHarness({
        lessonCount: 1,
        ratePerHour: 100000,
        sana: "2026-03-10",
        haftaKuni: "SESHANBA",
      });

      harness.state.teachers.push({
        id: "teacher_2",
        userId: "user_teacher_2",
        employeeId: null,
        subjectId: "subject_1",
        firstName: "Akmal",
        lastName: "Tursunov",
        user: {
          id: "user_teacher_2",
          username: "akmal.tursunov",
          isActive: true,
          role: "TEACHER",
        },
      });

      harness.state.teacherRates = [
        {
          id: "rate_replace_1",
          organizationId: "org_main",
          teacherId: "teacher_2",
          subjectId: "subject_1",
          ratePerHour: new Prisma.Decimal(replacementRate),
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          effectiveTo: null,
        },
      ];

      harness.state.realLessons.push({
        id: "lesson_replaced_1",
        organizationId: "org_main",
        teacherId: "teacher_1",
        subjectId: "subject_1",
        classroomId: "class_1",
        darsJadvaliId: "dars_1",
        startAt: new Date("2026-03-10T03:00:00.000Z"),
        endAt: new Date("2026-03-10T04:00:00.000Z"),
        durationMinutes: 60,
        status: "REPLACED",
        replacedByTeacherId: "teacher_2",
        note: null,
        createdAt: new Date("2026-03-10T04:05:00.000Z"),
      });

      await runWithStubs(harness.stubs, async () => {
        const result = await refreshDraftPayrollForLesson({
          lessonId: "lesson_replaced_1",
          actorUserId: "user_admin_1",
          req: {},
        });

        assert.equal(result.refreshed, true);
        assert.equal(result.skipped, false);
      });

      assert.equal(harness.state.payrollLines.length, 1);
      const line = harness.state.payrollLines[0];
      assert.equal(line.teacherId, "teacher_2");
      assert.equal(line.meta?.sourceTeacherId, "teacher_1");
      assert.equal(decimalToNumber(line.ratePerHour), replacementRate);
      assert.equal(decimalToNumber(line.amount), replacementRate);
    });
  },
);
