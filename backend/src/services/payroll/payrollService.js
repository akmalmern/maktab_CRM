const prisma = require("../../prisma");
const { Prisma } = require("@prisma/client");
const { ApiError } = require("../../utils/apiError");
const {
  localDayStartUtc,
  utcDateToTashkentIsoDate,
} = require("../../utils/tashkentTime");

const MAIN_ORG_KEY = "MAIN";
const MAIN_ORG_NAME = "Asosiy tashkilot";
const ACTIVE_PAYROLL_STATUSES = ["DRAFT", "APPROVED", "PAID"];
const DECIMAL_ZERO = new Prisma.Decimal(0);
const MANUAL_ADJUSTMENT_TYPES = new Set(["BONUS", "PENALTY", "MANUAL"]);
const REGENERATE_LINE_TYPES = ["LESSON", "FIXED_SALARY", "ADVANCE_DEDUCTION"];
const LESSON_PAYROLL_MODES = new Set(["LESSON_BASED", "MIXED"]);
const HAFTA_KUNI_TO_WEEKDAY = Object.freeze({
  DUSHANBA: 1,
  SESHANBA: 2,
  CHORSHANBA: 3,
  PAYSHANBA: 4,
  JUMA: 5,
  SHANBA: 6,
});

function cleanOptional(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str.length ? str : undefined;
}

function decimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === undefined || value === null) return DECIMAL_ZERO;
  return new Prisma.Decimal(value);
}

function money(value) {
  return decimal(value).toDecimalPlaces(2);
}

function clampPaidAmountToPayable(paidAmount, payableAmount) {
  const payable = money(payableAmount);
  if (payable.lte(DECIMAL_ZERO)) return DECIMAL_ZERO;
  const paid = money(paidAmount);
  if (paid.lte(DECIMAL_ZERO)) return DECIMAL_ZERO;
  if (paid.gte(payable)) return payable;
  return paid;
}

function isEmployeeLessonPayrollEligible(employee) {
  if (!employee) return false;
  if (!employee.isPayrollEligible) return false;
  if (employee.employmentStatus !== "ACTIVE") return false;
  return LESSON_PAYROLL_MODES.has(employee.payrollMode);
}

function getPayrollItemPaymentStatus({ paidAmount, payableAmount }) {
  const payable = money(payableAmount);
  if (payable.lte(DECIMAL_ZERO)) return "PAID";
  const paid = clampPaidAmountToPayable(paidAmount, payable);
  if (paid.lte(DECIMAL_ZERO)) return "UNPAID";
  if (paid.gte(payable)) return "PAID";
  return "PARTIAL";
}

function monthKeyFromDateValue(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_DATE", "Sana noto'g'ri");
  }
  return utcDateToTashkentIsoDate(date).slice(0, 7);
}

function monthKeyToUtcRange(periodMonth) {
  const value = String(periodMonth || "").trim();
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "periodMonth formati YYYY-MM bo'lishi kerak");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const startIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const endIso = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return {
    periodMonth: value,
    periodStart: localDayStartUtc(startIso),
    periodEnd: localDayStartUtc(endIso),
  };
}

function parseTimeToMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || "").split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function getSlotDurationMinutes(vaqtOraliq) {
  const start = parseTimeToMinutes(vaqtOraliq?.boshlanishVaqti);
  const end = parseTimeToMinutes(vaqtOraliq?.tugashVaqti);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

function getAcademicYearFromPeriodMonth(periodMonth) {
  const [yearRaw, monthRaw] = String(periodMonth || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "periodMonth formati YYYY-MM bo'lishi kerak");
  }
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function weekdayOccurrencesForPeriodMonth(periodMonth) {
  const [yearRaw, monthRaw] = String(periodMonth || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "periodMonth formati YYYY-MM bo'lishi kerak");
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    counts[weekday] += 1;
  }
  return counts;
}

function teacherDisplayLabel(teacher) {
  if (!teacher) return null;
  const full = `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
  const username = teacher.user?.username ? `@${teacher.user.username}` : "";
  if (full && username) return `${full} (${username})`;
  return full || username || teacher.id || null;
}

function csvEscape(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function toIsoOrEmpty(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function buildAuditRequestMeta(req) {
  return {
    ip:
      cleanOptional(req?.headers?.["x-forwarded-for"]) ||
      cleanOptional(req?.ip) ||
      cleanOptional(req?.socket?.remoteAddress) ||
      null,
    userAgent: cleanOptional(req?.headers?.["user-agent"]) || null,
  };
}

async function ensureMainOrganization(tx) {
  return tx.organization.upsert({
    where: { key: MAIN_ORG_KEY },
    update: {},
    create: { key: MAIN_ORG_KEY, name: MAIN_ORG_NAME },
    select: { id: true, key: true, name: true },
  });
}

async function resolvePayrollRunActorUserId(tx, preferredUserId = null) {
  if (preferredUserId) return preferredUserId;
  const adminUser = await tx.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!adminUser) {
    throw new ApiError(
      409,
      "PAYROLL_RUN_ACTOR_REQUIRED",
      "Payroll run yaratish uchun aktiv ADMIN foydalanuvchi topilmadi",
    );
  }
  return adminUser.id;
}

async function createAuditLog(
  tx,
  { organizationId, actorUserId, action, entityType, entityId, payrollRunId, before, after, reason, req },
) {
  await tx.auditLog.create({
    data: {
      organizationId,
      actorUserId: actorUserId || null,
      action,
      entityType,
      entityId,
      payrollRunId: payrollRunId || null,
      before: before ?? null,
      after: after ?? null,
      reason: reason || null,
      ...buildAuditRequestMeta(req),
    },
  });
}

async function createPayrollCashEntry(
  tx,
  {
    organizationId,
    payrollRunId = null,
    payrollItemId = null,
    payrollItemPaymentId = null,
    amount,
    paymentMethod,
    entryType = "PAYROLL_PAYOUT",
    occurredAt,
    externalRef,
    note,
    createdByUserId = null,
    meta = null,
  },
) {
  return tx.payrollCashEntry.create({
    data: {
      organizationId,
      payrollRunId,
      payrollItemId,
      payrollItemPaymentId,
      amount,
      paymentMethod,
      entryType,
      occurredAt: occurredAt || new Date(),
      externalRef: cleanOptional(externalRef) || null,
      note: cleanOptional(note) || null,
      createdByUserId: createdByUserId || null,
      meta: meta || null,
    },
  });
}

function overlapRateWhere({ organizationId, teacherId, subjectId, effectiveFrom, effectiveTo, excludeId }) {
  return {
    organizationId,
    subjectId,
    ...(teacherId ? { teacherId } : {}),
    ...(excludeId ? { id: { not: excludeId } } : {}),
    ...(effectiveTo ? { effectiveFrom: { lt: effectiveTo } } : {}),
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
  };
}

async function assertNoTeacherRateOverlap(tx, payload, excludeId = null) {
  const overlap = await tx.teacherRate.findFirst({
    where: overlapRateWhere({
      organizationId: payload.organizationId,
      teacherId: payload.teacherId,
      subjectId: payload.subjectId,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
      excludeId,
    }),
    select: { id: true },
  });
  if (overlap) {
    throw new ApiError(409, "TEACHER_RATE_OVERLAP", "Teacher rate intervali overlap bo'lyapti", {
      overlapRateId: overlap.id,
    });
  }
}

async function assertNoSubjectDefaultRateOverlap(tx, payload, excludeId = null) {
  const overlap = await tx.subjectDefaultRate.findFirst({
    where: overlapRateWhere({
      organizationId: payload.organizationId,
      subjectId: payload.subjectId,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
      excludeId,
    }),
    select: { id: true },
  });
  if (overlap) {
    throw new ApiError(409, "SUBJECT_RATE_OVERLAP", "Subject default rate intervali overlap bo'lyapti", {
      overlapRateId: overlap.id,
    });
  }
}

async function assertTeacherExists(tx, teacherId) {
  const teacher = await tx.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  return teacher;
}

function normalizeDisplayName(firstName, lastName, fallback = null) {
  const full = `${firstName || ""} ${lastName || ""}`.trim();
  return full || fallback || null;
}

async function assertEmployeeExists(tx, { employeeId, organizationId }) {
  const employee = await tx.employee.findFirst({
    where: { id: employeeId, organizationId },
    include: {
      user: { select: { id: true, username: true, isActive: true, role: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      admin: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!employee) throw new ApiError(404, "EMPLOYEE_NOT_FOUND", "Xodim topilmadi");
  return employee;
}

async function ensureEmployeeForTeacher(tx, { teacherId, organizationId }) {
  const teacher = await tx.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: { select: { id: true, username: true, isActive: true, role: true } },
      employee: {
        include: {
          user: { select: { id: true, username: true, isActive: true, role: true } },
        },
      },
    },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");

  let employee = teacher.employee;
  if (!employee) {
    employee = await tx.employee.findUnique({
      where: { userId: teacher.userId },
      include: {
        user: { select: { id: true, username: true, isActive: true, role: true } },
      },
    });
  }

  if (!employee) {
    employee = await tx.employee.create({
      data: {
        organizationId,
        userId: teacher.userId,
        kind: "TEACHER",
        payrollMode: "LESSON_BASED",
        employmentStatus: teacher.user?.isActive ? "ACTIVE" : "ARCHIVED",
        isPayrollEligible: true,
        firstName: teacher.firstName || null,
        lastName: teacher.lastName || null,
        note: "Auto-created from Teacher profile (payroll backfill)",
      },
      include: {
        user: { select: { id: true, username: true, isActive: true, role: true } },
      },
    });
  } else {
    const patch = {};
    if (!teacher.employeeId || teacher.employeeId !== employee.id) {
      patch.employeeId = employee.id;
    }
    if (employee.organizationId !== organizationId) {
      throw new ApiError(409, "EMPLOYEE_ORG_MISMATCH", "Teacher employee boshqa organization ga tegishli");
    }
    if ((employee.kind || "TEACHER") !== "TEACHER") {
      patch.kind = "TEACHER";
    }
    const expectedStatus = teacher.user?.isActive ? "ACTIVE" : "ARCHIVED";
    if (employee.employmentStatus !== expectedStatus) {
      patch.employmentStatus = expectedStatus;
    }
    if ((teacher.firstName || null) !== (employee.firstName || null)) {
      patch.firstName = teacher.firstName || null;
    }
    if ((teacher.lastName || null) !== (employee.lastName || null)) {
      patch.lastName = teacher.lastName || null;
    }
    if (Object.keys(patch).some((k) => k !== "employeeId")) {
      employee = await tx.employee.update({
        where: { id: employee.id },
        data: {
          ...("kind" in patch ? { kind: patch.kind } : {}),
          ...("employmentStatus" in patch ? { employmentStatus: patch.employmentStatus } : {}),
          ...("firstName" in patch ? { firstName: patch.firstName } : {}),
          ...("lastName" in patch ? { lastName: patch.lastName } : {}),
        },
        include: {
          user: { select: { id: true, username: true, isActive: true, role: true } },
        },
      });
    }
    if (patch.employeeId) {
      await tx.teacher.update({
        where: { id: teacher.id },
        data: { employeeId: employee.id },
      });
    }
  }

  if (!teacher.employeeId || teacher.employeeId !== employee.id) {
    await tx.teacher.update({
      where: { id: teacher.id },
      data: { employeeId: employee.id },
    });
  }

  return { teacher, employee };
}

async function assertSubjectExists(tx, subjectId) {
  const subject = await tx.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true } });
  if (!subject) throw new ApiError(404, "SUBJECT_NOT_FOUND", "Fan topilmadi");
  return subject;
}

async function assertClassroomExists(tx, classroomId) {
  const classroom = await tx.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, name: true, academicYear: true, isArchived: true },
  });
  if (!classroom) throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  return classroom;
}

async function assertDarsJadvaliExists(tx, darsJadvaliId) {
  if (!darsJadvaliId) return null;
  const row = await tx.darsJadvali.findUnique({
    where: { id: darsJadvaliId },
    select: { id: true, oqituvchiId: true, fanId: true, sinfId: true },
  });
  if (!row) throw new ApiError(404, "DARS_JADVALI_NOT_FOUND", "Dars jadvali topilmadi");
  return row;
}

function computeDurationMinutes(startAt, endAt, providedDuration) {
  if (Number.isFinite(Number(providedDuration)) && Number(providedDuration) > 0) {
    return Math.trunc(Number(providedDuration));
  }
  const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  const mins = Math.round(diffMs / 60000);
  if (!Number.isFinite(mins) || mins <= 0) {
    throw new ApiError(400, "INVALID_LESSON_DURATION", "durationMinutes noto'g'ri");
  }
  return mins;
}

async function listRealLessons({ query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 200);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = { organizationId: org.id };
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.status) where.status = query.status;
    if (query.periodMonth) {
      const range = monthKeyToUtcRange(query.periodMonth);
      where.startAt = { gte: range.periodStart, lt: range.periodEnd };
    }

    const [items, total] = await Promise.all([
      tx.realLesson.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          replacedByTeacher: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      tx.realLesson.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      realLessons: items,
    };
  });
}

async function createRealLesson({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await Promise.all([
      assertTeacherExists(tx, body.teacherId),
      assertSubjectExists(tx, body.subjectId),
      assertClassroomExists(tx, body.classroomId),
      body.replacedByTeacherId ? assertTeacherExists(tx, body.replacedByTeacherId) : Promise.resolve(null),
    ]);
    const darsJadvali = body.darsJadvaliId ? await assertDarsJadvaliExists(tx, body.darsJadvaliId) : null;
    if (darsJadvali) {
      if (
        darsJadvali.oqituvchiId !== body.teacherId ||
        darsJadvali.fanId !== body.subjectId ||
        darsJadvali.sinfId !== body.classroomId
      ) {
        throw new ApiError(409, "REAL_LESSON_SCHEDULE_MISMATCH", "Real lesson dars jadvali bilan mos emas");
      }
    }
    if (body.darsJadvaliId) {
      const duplicateBySchedule = await tx.realLesson.findFirst({
        where: {
          organizationId: org.id,
          darsJadvaliId: body.darsJadvaliId,
          startAt: body.startAt,
        },
        select: { id: true },
      });
      if (duplicateBySchedule) {
        throw new ApiError(
          409,
          "REAL_LESSON_DUPLICATE",
          "Bu jadval uchun shu vaqtga RealLesson allaqachon mavjud",
          { realLessonId: duplicateBySchedule.id },
        );
      }
    }
    const durationMinutes = computeDurationMinutes(body.startAt, body.endAt, body.durationMinutes);
    const lesson = await tx.realLesson.create({
      data: {
        organizationId: org.id,
        teacherId: body.teacherId,
        subjectId: body.subjectId,
        classroomId: body.classroomId,
        darsJadvaliId: body.darsJadvaliId || null,
        startAt: body.startAt,
        endAt: body.endAt,
        durationMinutes,
        status: body.status || "DONE",
        replacedByTeacherId: body.replacedByTeacherId || null,
        note: cleanOptional(body.note) || null,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "REAL_LESSON_CREATE",
      entityType: "REAL_LESSON",
      entityId: lesson.id,
      after: {
        teacherId: lesson.teacherId,
        subjectId: lesson.subjectId,
        classroomId: lesson.classroomId,
        status: lesson.status,
        startAt: lesson.startAt,
        endAt: lesson.endAt,
        durationMinutes: lesson.durationMinutes,
      },
      req,
    });
    return { lesson };
  });
}

async function updateRealLessonStatus({ lessonId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.realLesson.findFirst({
      where: { id: lessonId, organizationId: org.id },
      select: {
        id: true,
        status: true,
        note: true,
        replacedByTeacherId: true,
        payrollLines: { select: { id: true }, take: 1 },
      },
    });
    if (!before) throw new ApiError(404, "REAL_LESSON_NOT_FOUND", "Real lesson topilmadi");
    if (before.payrollLines.length) {
      throw new ApiError(409, "REAL_LESSON_LOCKED_BY_PAYROLL", "Dars payrollga tushgan. Statusni o'zgartirib bo'lmaydi");
    }
    if (body.replacedByTeacherId) await assertTeacherExists(tx, body.replacedByTeacherId);

    const lesson = await tx.realLesson.update({
      where: { id: lessonId },
      data: {
        status: body.status,
        replacedByTeacherId: body.replacedByTeacherId || null,
        note: body.note === undefined ? undefined : cleanOptional(body.note) || null,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "REAL_LESSON_STATUS_UPDATE",
      entityType: "REAL_LESSON",
      entityId: lesson.id,
      before: { status: before.status, replacedByTeacherId: before.replacedByTeacherId, note: before.note },
      after: { status: lesson.status, replacedByTeacherId: lesson.replacedByTeacherId, note: lesson.note },
      req,
    });
    return { lesson };
  });
}

async function bulkUpdateRealLessonStatus({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const lessonIds = [...new Set((body.lessonIds || []).filter(Boolean))];
    if (!lessonIds.length) {
      throw new ApiError(400, "REAL_LESSON_IDS_REQUIRED", "lessonIds bo'sh bo'lmasligi kerak");
    }

    if (body.replacedByTeacherId) {
      await assertTeacherExists(tx, body.replacedByTeacherId);
    }

    const lessons = await tx.realLesson.findMany({
      where: { organizationId: org.id, id: { in: lessonIds } },
      select: {
        id: true,
        status: true,
        note: true,
        replacedByTeacherId: true,
        payrollLines: { select: { id: true }, take: 1 },
      },
    });
    const byId = new Map(lessons.map((row) => [row.id, row]));

    const updated = [];
    const skipped = [];

    for (const lessonId of lessonIds) {
      const before = byId.get(lessonId);
      if (!before) {
        skipped.push({ lessonId, code: "REAL_LESSON_NOT_FOUND", reason: "Real lesson topilmadi" });
        continue;
      }
      if (before.payrollLines?.length) {
        skipped.push({
          lessonId,
          code: "REAL_LESSON_LOCKED_BY_PAYROLL",
          reason: "Dars payrollga tushgan. Statusni o'zgartirib bo'lmaydi",
        });
        continue;
      }

      const lesson = await tx.realLesson.update({
        where: { id: lessonId },
        data: {
          status: body.status,
          replacedByTeacherId: body.replacedByTeacherId || null,
          note: body.note === undefined ? undefined : cleanOptional(body.note) || null,
        },
        select: {
          id: true,
          status: true,
          note: true,
          replacedByTeacherId: true,
        },
      });
      updated.push({
        lessonId: lesson.id,
        before: { status: before.status, replacedByTeacherId: before.replacedByTeacherId, note: before.note },
        after: { status: lesson.status, replacedByTeacherId: lesson.replacedByTeacherId, note: lesson.note },
      });
    }

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "REAL_LESSON_STATUS_BULK_UPDATE",
      entityType: "REAL_LESSON_BULK",
      entityId: `BULK_${Date.now()}`,
      before: {
        selectedCount: lessonIds.length,
      },
      after: {
        status: body.status,
        replacedByTeacherId: body.replacedByTeacherId || null,
        noteProvided: body.note !== undefined,
        updatedCount: updated.length,
        skippedCount: skipped.length,
        updatedLessonIds: updated.slice(0, 100).map((row) => row.lessonId),
        skipped: skipped.slice(0, 100),
      },
      req,
    });

    return {
      summary: {
        selectedCount: lessonIds.length,
        updatedCount: updated.length,
        skippedCount: skipped.length,
      },
      updatedLessonIds: updated.map((row) => row.lessonId),
      skipped,
    };
  });
}

async function listTeacherRates({ query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = { organizationId: org.id };
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.activeOn) {
      where.effectiveFrom = { lte: query.activeOn };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gt: query.activeOn } }];
    }
    const [items, total] = await Promise.all([
      tx.teacherRate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }, { effectiveFrom: "desc" }],
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, username: true } },
        },
      }),
      tx.teacherRate.count({ where }),
    ]);
    return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), rates: items };
  });
}

function mapPayrollEmployeeConfigRow(employee) {
  return {
    id: employee.id,
    organizationId: employee.organizationId,
    userId: employee.userId,
    kind: employee.kind,
    payrollMode: employee.payrollMode,
    employmentStatus: employee.employmentStatus,
    isPayrollEligible: Boolean(employee.isPayrollEligible),
    fixedSalaryAmount: employee.fixedSalaryAmount,
    note: employee.note || null,
    firstName: employee.firstName || null,
    lastName: employee.lastName || null,
    hireDate: employee.hireDate || null,
    terminationDate: employee.terminationDate || null,
    user: employee.user
      ? {
          id: employee.user.id,
          username: employee.user.username,
          role: employee.user.role,
          isActive: Boolean(employee.user.isActive),
        }
      : null,
    teacher: employee.teacher
      ? {
          id: employee.teacher.id,
          firstName: employee.teacher.firstName,
          lastName: employee.teacher.lastName,
          subject: employee.teacher.subject || null,
        }
      : null,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

async function listPayrollEmployees({ query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = (page - 1) * limit;
  const search = cleanOptional(query.search);

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = {
      organizationId: org.id,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.payrollMode ? { payrollMode: query.payrollMode } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.isPayrollEligible !== undefined
        ? { isPayrollEligible: query.isPayrollEligible }
        : {}),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        {
          user: {
            is: {
              username: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          teacher: {
            is: {
              firstName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          teacher: {
            is: {
              lastName: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      tx.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ kind: "asc" }, { firstName: "asc" }, { lastName: "asc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              isActive: true,
            },
          },
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              subject: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      tx.employee.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      employees: items.map(mapPayrollEmployeeConfigRow),
    };
  });
}

async function updatePayrollEmployeeConfig({ employeeId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.employee.findFirst({
      where: { id: employeeId, organizationId: org.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!before) {
      throw new ApiError(404, "PAYROLL_EMPLOYEE_NOT_FOUND", "Payroll xodim topilmadi");
    }

    const nextPayrollMode = body.payrollMode ?? before.payrollMode;
    const nextFixedSalaryAmount =
      body.fixedSalaryAmount !== undefined
        ? body.fixedSalaryAmount === null
          ? null
          : money(body.fixedSalaryAmount)
        : before.fixedSalaryAmount;

    if (["FIXED", "MIXED"].includes(nextPayrollMode)) {
      const fixedSalary = nextFixedSalaryAmount === null ? DECIMAL_ZERO : decimal(nextFixedSalaryAmount);
      if (fixedSalary.lte(DECIMAL_ZERO)) {
        throw new ApiError(
          400,
          "PAYROLL_FIXED_SALARY_REQUIRED",
          "FIXED/MIXED rejim uchun oklad summasi musbat bo'lishi kerak",
        );
      }
    }

    const patch = {};
    if (body.payrollMode !== undefined) patch.payrollMode = body.payrollMode;
    if (body.fixedSalaryAmount !== undefined) {
      patch.fixedSalaryAmount = body.fixedSalaryAmount === null ? null : money(body.fixedSalaryAmount);
    }
    if (body.isPayrollEligible !== undefined) patch.isPayrollEligible = body.isPayrollEligible;
    if (body.note !== undefined) patch.note = cleanOptional(body.note) || null;

    if (Object.keys(patch).length === 0) {
      return { employee: mapPayrollEmployeeConfigRow(before) };
    }

    const updated = await tx.employee.update({
      where: { id: before.id },
      data: patch,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_EMPLOYEE_CONFIG_UPDATE",
      entityType: "EMPLOYEE",
      entityId: updated.id,
      before: {
        payrollMode: before.payrollMode,
        fixedSalaryAmount: before.fixedSalaryAmount === null ? null : String(before.fixedSalaryAmount),
        isPayrollEligible: before.isPayrollEligible,
        employmentStatus: before.employmentStatus,
        note: before.note || null,
      },
      after: {
        payrollMode: updated.payrollMode,
        fixedSalaryAmount: updated.fixedSalaryAmount === null ? null : String(updated.fixedSalaryAmount),
        isPayrollEligible: updated.isPayrollEligible,
        employmentStatus: updated.employmentStatus,
        note: updated.note || null,
      },
      req,
    });

    return {
      employee: mapPayrollEmployeeConfigRow(updated),
    };
  });
}

async function createTeacherRate({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await Promise.all([assertTeacherExists(tx, body.teacherId), assertSubjectExists(tx, body.subjectId)]);
    const payload = {
      organizationId: org.id,
      teacherId: body.teacherId,
      subjectId: body.subjectId,
      ratePerHour: money(body.ratePerHour),
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo || null,
      note: cleanOptional(body.note) || null,
    };
    await assertNoTeacherRateOverlap(tx, payload);
    const rate = await tx.teacherRate.create({
      data: { ...payload, createdByUserId: actorUserId || null },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_TEACHER_RATE_CREATE",
      entityType: "TEACHER_RATE",
      entityId: rate.id,
      after: {
        teacherId: rate.teacherId,
        subjectId: rate.subjectId,
        ratePerHour: String(rate.ratePerHour),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      },
      req,
    });
    return { rate };
  });
}

async function updateTeacherRate({ rateId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.teacherRate.findFirst({ where: { id: rateId, organizationId: org.id } });
    if (!before) throw new ApiError(404, "TEACHER_RATE_NOT_FOUND", "Teacher rate topilmadi");

    const payload = {
      organizationId: org.id,
      teacherId: body.teacherId || before.teacherId,
      subjectId: body.subjectId || before.subjectId,
      ratePerHour: body.ratePerHour === undefined ? before.ratePerHour : money(body.ratePerHour),
      effectiveFrom: body.effectiveFrom || before.effectiveFrom,
      effectiveTo: body.effectiveTo === undefined ? before.effectiveTo : body.effectiveTo,
      note: body.note === undefined ? before.note : cleanOptional(body.note) || null,
    };
    if (payload.teacherId !== before.teacherId) await assertTeacherExists(tx, payload.teacherId);
    if (payload.subjectId !== before.subjectId) await assertSubjectExists(tx, payload.subjectId);
    await assertNoTeacherRateOverlap(tx, payload, rateId);

    const rate = await tx.teacherRate.update({
      where: { id: rateId },
      data: {
        teacherId: payload.teacherId,
        subjectId: payload.subjectId,
        ratePerHour: payload.ratePerHour,
        effectiveFrom: payload.effectiveFrom,
        effectiveTo: payload.effectiveTo || null,
        note: payload.note,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_TEACHER_RATE_UPDATE",
      entityType: "TEACHER_RATE",
      entityId: rate.id,
      before: {
        teacherId: before.teacherId,
        subjectId: before.subjectId,
        ratePerHour: String(before.ratePerHour),
        effectiveFrom: before.effectiveFrom,
        effectiveTo: before.effectiveTo,
      },
      after: {
        teacherId: rate.teacherId,
        subjectId: rate.subjectId,
        ratePerHour: String(rate.ratePerHour),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      },
      req,
    });
    return { rate };
  });
}

async function deleteTeacherRate({ rateId, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.teacherRate.findFirst({
      where: { id: rateId, organizationId: org.id },
      include: { payrollLines: { select: { id: true }, take: 1 } },
    });
    if (!before) throw new ApiError(404, "TEACHER_RATE_NOT_FOUND", "Teacher rate topilmadi");
    if (before.payrollLines.length) {
      throw new ApiError(409, "TEACHER_RATE_IN_USE", "Rate payroll line'larda ishlatilgan, o'chirib bo'lmaydi");
    }
    await tx.teacherRate.delete({ where: { id: rateId } });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_TEACHER_RATE_DELETE",
      entityType: "TEACHER_RATE",
      entityId: rateId,
      before: {
        teacherId: before.teacherId,
        subjectId: before.subjectId,
        ratePerHour: String(before.ratePerHour),
      },
      req,
    });
    return { ok: true };
  });
}

async function listSubjectDefaultRates({ query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = { organizationId: org.id };
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.activeOn) {
      where.effectiveFrom = { lte: query.activeOn };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gt: query.activeOn } }];
    }
    const [items, total] = await Promise.all([
      tx.subjectDefaultRate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ subjectId: "asc" }, { effectiveFrom: "desc" }],
        include: {
          subject: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, username: true } },
        },
      }),
      tx.subjectDefaultRate.count({ where }),
    ]);
    return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), rates: items };
  });
}

async function createSubjectDefaultRate({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await assertSubjectExists(tx, body.subjectId);
    const payload = {
      organizationId: org.id,
      subjectId: body.subjectId,
      ratePerHour: money(body.ratePerHour),
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo || null,
      note: cleanOptional(body.note) || null,
    };
    await assertNoSubjectDefaultRateOverlap(tx, payload);
    const rate = await tx.subjectDefaultRate.create({
      data: { ...payload, createdByUserId: actorUserId || null },
      include: { subject: { select: { id: true, name: true } } },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_SUBJECT_RATE_CREATE",
      entityType: "SUBJECT_DEFAULT_RATE",
      entityId: rate.id,
      after: {
        subjectId: rate.subjectId,
        ratePerHour: String(rate.ratePerHour),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      },
      req,
    });
    return { rate };
  });
}

async function updateSubjectDefaultRate({ rateId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.subjectDefaultRate.findFirst({
      where: { id: rateId, organizationId: org.id },
    });
    if (!before) throw new ApiError(404, "SUBJECT_RATE_NOT_FOUND", "Subject default rate topilmadi");

    const payload = {
      organizationId: org.id,
      subjectId: body.subjectId || before.subjectId,
      ratePerHour: body.ratePerHour === undefined ? before.ratePerHour : money(body.ratePerHour),
      effectiveFrom: body.effectiveFrom || before.effectiveFrom,
      effectiveTo: body.effectiveTo === undefined ? before.effectiveTo : body.effectiveTo,
      note: body.note === undefined ? before.note : cleanOptional(body.note) || null,
    };
    if (payload.subjectId !== before.subjectId) await assertSubjectExists(tx, payload.subjectId);
    await assertNoSubjectDefaultRateOverlap(tx, payload, rateId);

    const rate = await tx.subjectDefaultRate.update({
      where: { id: rateId },
      data: {
        subjectId: payload.subjectId,
        ratePerHour: payload.ratePerHour,
        effectiveFrom: payload.effectiveFrom,
        effectiveTo: payload.effectiveTo || null,
        note: payload.note,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_SUBJECT_RATE_UPDATE",
      entityType: "SUBJECT_DEFAULT_RATE",
      entityId: rate.id,
      before: {
        subjectId: before.subjectId,
        ratePerHour: String(before.ratePerHour),
        effectiveFrom: before.effectiveFrom,
        effectiveTo: before.effectiveTo,
      },
      after: {
        subjectId: rate.subjectId,
        ratePerHour: String(rate.ratePerHour),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      },
      req,
    });
    return { rate };
  });
}

async function deleteSubjectDefaultRate({ rateId, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.subjectDefaultRate.findFirst({
      where: { id: rateId, organizationId: org.id },
      include: { payrollLines: { select: { id: true }, take: 1 } },
    });
    if (!before) throw new ApiError(404, "SUBJECT_RATE_NOT_FOUND", "Subject default rate topilmadi");
    if (before.payrollLines.length) {
      throw new ApiError(409, "SUBJECT_RATE_IN_USE", "Rate payroll line'larda ishlatilgan, o'chirib bo'lmaydi");
    }
    await tx.subjectDefaultRate.delete({ where: { id: rateId } });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_SUBJECT_RATE_DELETE",
      entityType: "SUBJECT_DEFAULT_RATE",
      entityId: rateId,
      before: {
        subjectId: before.subjectId,
        ratePerHour: String(before.ratePerHour),
      },
      req,
    });
    return { ok: true };
  });
}

async function listAdvancePayments({ query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = {
      organizationId: org.id,
      ...(query.periodMonth ? { periodMonth: query.periodMonth } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };

    const [items, total] = await Promise.all([
      tx.advancePayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
          teacher: { select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } } },
          createdByUser: { select: { id: true, username: true } },
        },
      }),
      tx.advancePayment.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      advances: items,
    };
  });
}

async function createAdvancePayment({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);

    let employee = null;
    let teacher = null;
    if (body.employeeId) {
      employee = await assertEmployeeExists(tx, { employeeId: body.employeeId, organizationId: org.id });
    }
    if (body.teacherId) {
      teacher = await assertTeacherExists(tx, body.teacherId);
    }

    if (!employee && teacher) {
      const ensured = await ensureEmployeeForTeacher(tx, {
        teacherId: teacher.id,
        organizationId: org.id,
      });
      employee = ensured.employee;
      teacher = teacher || ensured.teacher;
    }
    if (!employee) {
      throw new ApiError(400, "ADVANCE_OWNER_REQUIRED", "teacherId yoki employeeId kerak");
    }

    let teacherIdForAdvance = teacher?.id || null;
    if (employee.teacher?.id) {
      if (teacherIdForAdvance && teacherIdForAdvance !== employee.teacher.id) {
        throw new ApiError(
          409,
          "ADVANCE_OWNER_MISMATCH",
          "employeeId va teacherId bir-biriga mos emas",
          { employeeId: employee.id, employeeTeacherId: employee.teacher.id, teacherId: teacherIdForAdvance },
        );
      }
      teacherIdForAdvance = employee.teacher.id;
    }

    const periodMonth = cleanOptional(body.periodMonth) || monthKeyFromDateValue(body.paidAt);
    monthKeyToUtcRange(periodMonth);
    const run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    const amount = money(body.amount);
    const paidAt = body.paidAt || new Date();

    const advance = await tx.advancePayment.create({
      data: {
        organizationId: org.id,
        periodMonth,
        employeeId: employee.id,
        teacherId: teacherIdForAdvance,
        amount,
        paidAt,
        note: cleanOptional(body.note) || null,
        createdByUserId: actorUserId || null,
      },
    });

    let syncedRunId = null;
    if (run?.status === "DRAFT") {
      const item = await getOrCreatePayrollItem(tx, {
        organizationId: org.id,
        payrollRunId: run.id,
        employeeId: employee.id,
        teacherId: teacherIdForAdvance,
      });
      await tx.payrollLine.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          employeeId: employee.id,
          teacherId: teacherIdForAdvance,
          type: "ADVANCE_DEDUCTION",
          advancePaymentId: advance.id,
          amount: amount.neg(),
          description: cleanOptional(body.note) || "Avans ushlanmasi",
          createdByUserId: actorUserId || null,
          meta: {
            source: "ADVANCE_PAYMENT",
            advancePaymentId: advance.id,
            periodMonth,
            paidAt,
          },
        },
      });
      await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          generatedAt: new Date(),
          calcVersion: { increment: 1 },
          generationSummary: {
            mode: "ADVANCE_SYNC",
            periodMonth,
            advancePaymentId: advance.id,
            syncedAt: new Date().toISOString(),
          },
        },
      });
      syncedRunId = run.id;
    }

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId: actorUserId || null,
      action: "PAYROLL_ADVANCE_CREATE",
      entityType: "ADVANCE_PAYMENT",
      entityId: advance.id,
      payrollRunId: run?.id || null,
      after: {
        periodMonth: advance.periodMonth,
        employeeId: advance.employeeId,
        teacherId: advance.teacherId,
        amount: String(advance.amount),
        paidAt: advance.paidAt,
        syncedRunId,
      },
      req,
    });

    return {
      advance,
      syncedRunId,
    };
  });
}

async function deleteAdvancePayment({ advanceId, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const advance = await tx.advancePayment.findFirst({
      where: { id: advanceId, organizationId: org.id },
      include: {
        payrollLines: {
          select: { id: true, payrollRunId: true },
        },
      },
    });
    if (!advance) throw new ApiError(404, "ADVANCE_NOT_FOUND", "Avans topilmadi");

    const run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth: advance.periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    const affectedRunIds = [...new Set((advance.payrollLines || []).map((line) => line.payrollRunId).filter(Boolean))];
    if (affectedRunIds.length) {
      const affectedRuns = await tx.payrollRun.findMany({
        where: { id: { in: affectedRunIds } },
        select: { id: true, status: true },
      });
      const lockedRun = affectedRuns.find((row) => row.status !== "DRAFT");
      if (lockedRun) {
        throw new ApiError(
          409,
          "PAYROLL_RUN_LOCKED",
          "Avans locklangan payroll run bilan bog'langan. O'chirib bo'lmaydi",
          { runId: lockedRun.id, status: lockedRun.status },
        );
      }
    }

    if (advance.payrollLines.length) {
      await tx.payrollLine.deleteMany({
        where: { id: { in: advance.payrollLines.map((line) => line.id) } },
      });
    }

    for (const runId of affectedRunIds) {
      await recalculatePayrollRunAggregates(tx, { payrollRunId: runId });
      await tx.payrollRun.update({
        where: { id: runId },
        data: {
          generatedAt: new Date(),
          calcVersion: { increment: 1 },
          generationSummary: {
            mode: "ADVANCE_SYNC",
            periodMonth: advance.periodMonth,
            deletedAdvancePaymentId: advance.id,
            syncedAt: new Date().toISOString(),
          },
        },
      });
    }

    await tx.advancePayment.delete({ where: { id: advance.id } });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId: actorUserId || null,
      action: "PAYROLL_ADVANCE_DELETE",
      entityType: "ADVANCE_PAYMENT",
      entityId: advance.id,
      payrollRunId: run?.id || null,
      before: {
        periodMonth: advance.periodMonth,
        employeeId: advance.employeeId,
        teacherId: advance.teacherId,
        amount: String(advance.amount),
        paidAt: advance.paidAt,
      },
      after: { affectedRunIds },
      req,
    });

    return { ok: true, affectedRunIds };
  });
}

function rateMatchesAt(rate, at) {
  const fromOk = new Date(rate.effectiveFrom).getTime() <= new Date(at).getTime();
  const toOk = !rate.effectiveTo || new Date(rate.effectiveTo).getTime() > new Date(at).getTime();
  return fromOk && toOk;
}

async function loadRatesForPeriod(tx, { organizationId, lessons, periodStart, periodEnd }) {
  // REPLACED darslarda hisob replacement teacher orqali yuradi, shuning uchun ikkalasini preload qilamiz.
  const teacherIds = [
    ...new Set(
      lessons
        .flatMap((lesson) => [lesson.teacherId, lesson.replacedByTeacherId])
        .filter(Boolean),
    ),
  ];
  const subjectIds = [...new Set(lessons.map((l) => l.subjectId))];
  const commonOverlap = {
    organizationId,
    effectiveFrom: { lt: periodEnd },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: periodStart } }],
  };

  const [teacherRates, subjectDefaultRates] = await Promise.all([
    teacherIds.length && subjectIds.length
      ? tx.teacherRate.findMany({
          where: {
            ...commonOverlap,
            teacherId: { in: teacherIds },
            subjectId: { in: subjectIds },
          },
          orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }, { effectiveFrom: "desc" }],
        })
      : Promise.resolve([]),
    subjectIds.length
      ? tx.subjectDefaultRate.findMany({
          where: {
            ...commonOverlap,
            subjectId: { in: subjectIds },
          },
          orderBy: [{ subjectId: "asc" }, { effectiveFrom: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  const teacherMap = new Map();
  for (const row of teacherRates) {
    const key = `${row.teacherId}:${row.subjectId}`;
    if (!teacherMap.has(key)) teacherMap.set(key, []);
    teacherMap.get(key).push(row);
  }
  const subjectMap = new Map();
  for (const row of subjectDefaultRates) {
    if (!subjectMap.has(row.subjectId)) subjectMap.set(row.subjectId, []);
    subjectMap.get(row.subjectId).push(row);
  }

  return { teacherMap, subjectMap };
}

function resolveRateForLesson({ lesson, teacherRateMap, subjectDefaultRateMap }) {
  const teacherRates = teacherRateMap.get(`${lesson.teacherId}:${lesson.subjectId}`) || [];
  const teacherRate = teacherRates.find((r) => rateMatchesAt(r, lesson.startAt));
  if (teacherRate) {
    return {
      rateSource: "TEACHER_RATE",
      ratePerHour: teacherRate.ratePerHour,
      teacherRateId: teacherRate.id,
      subjectDefaultRateId: null,
    };
  }
  const subjectRates = subjectDefaultRateMap.get(lesson.subjectId) || [];
  const subjectRate = subjectRates.find((r) => rateMatchesAt(r, lesson.startAt));
  if (subjectRate) {
    return {
      rateSource: "SUBJECT_DEFAULT_RATE",
      ratePerHour: subjectRate.ratePerHour,
      teacherRateId: null,
      subjectDefaultRateId: subjectRate.id,
    };
  }
  return null;
}

function calcLessonAmount(ratePerHour, minutes) {
  return money(decimal(ratePerHour).mul(decimal(minutes)).div(60));
}

function resolvePayrollTeacherIdForLesson(lesson) {
  if (lesson.status === "REPLACED") {
    if (!lesson.replacedByTeacherId) {
      throw new ApiError(
        409,
        "REAL_LESSON_REPLACED_TEACHER_REQUIRED",
        "REPLACED statusdagi darsda replacedByTeacherId bo'lishi kerak",
        { realLessonId: lesson.id },
      );
    }
    return lesson.replacedByTeacherId;
  }
  return lesson.teacherId;
}

async function getOrCreatePayrollItem(tx, { organizationId, payrollRunId, teacherId = null, employeeId = null }) {
  if (!teacherId && !employeeId) {
    throw new ApiError(400, "PAYROLL_ITEM_OWNER_REQUIRED", "Payroll item uchun teacherId yoki employeeId kerak");
  }

  let employee = null;
  let teacher = null;

  if (employeeId) {
    employee = await tx.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: {
        user: { select: { username: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!employee) throw new ApiError(404, "EMPLOYEE_NOT_FOUND", "Xodim topilmadi");
    if (!teacherId && employee.teacher?.id) {
      teacherId = employee.teacher.id;
    }
  }

  if (teacherId) {
    teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { username: true } },
      },
    });
    if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  }

  if (employee?.teacher?.id && teacherId && employee.teacher.id !== teacherId) {
    throw new ApiError(
      409,
      "PAYROLL_ITEM_OWNER_MISMATCH",
      "employeeId va teacherId bir-biriga mos emas",
      { employeeId: employee.id, employeeTeacherId: employee.teacher.id, teacherId },
    );
  }

  let item = null;
  if (employeeId) {
    item = await tx.payrollItem.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
      select: { id: true, teacherId: true, employeeId: true },
    });
  }
  if (!item && teacherId) {
    item = await tx.payrollItem.findUnique({
      where: { payrollRunId_teacherId: { payrollRunId, teacherId } },
      select: { id: true, teacherId: true, employeeId: true },
    });
  }
  if (item) {
    const patch = {};
    if (employeeId && item.employeeId !== employeeId) patch.employeeId = employeeId;
    if (teacherId && item.teacherId !== teacherId) patch.teacherId = teacherId;
    if (Object.keys(patch).length) {
      try {
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ApiError(
            409,
            "PAYROLL_ITEM_OWNER_CONFLICT",
            "Payroll item owner update qilishda konflikt bo'ldi",
            { payrollRunId, teacherId, employeeId },
          );
        }
        throw error;
      }
    }
    return item;
  }

  const firstName = employee?.firstName || teacher?.firstName || null;
  const lastName = employee?.lastName || teacher?.lastName || null;
  const username = employee?.user?.username || teacher?.user?.username || null;

  try {
    item = await tx.payrollItem.create({
      data: {
        organizationId,
        payrollRunId,
        employeeId: employeeId || null,
        teacherId: teacherId || null,
        teacherFirstNameSnapshot: firstName,
        teacherLastNameSnapshot: lastName,
        teacherUsernameSnapshot: username,
      },
      select: { id: true, teacherId: true, employeeId: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(
        409,
        "PAYROLL_ITEM_OWNER_CONFLICT",
        "Payroll item create qilishda owner konflikti yuz berdi",
        { payrollRunId, teacherId, employeeId },
      );
    }
    throw error;
  }
  return item;
}

function buildItemSummaryFromLines(lines) {
  let totalMinutes = 0;
  let lessonLineCount = 0;
  let lineCount = 0;
  let grossAmount = DECIMAL_ZERO;
  let bonusAmount = DECIMAL_ZERO;
  let penaltyAmountSigned = DECIMAL_ZERO;
  let manualAmount = DECIMAL_ZERO;
  let fixedSalaryAmount = DECIMAL_ZERO;
  let advanceDeductionAmountSigned = DECIMAL_ZERO;

  for (const line of lines) {
    lineCount += 1;
    const amount = decimal(line.amount);
    if (line.type === "LESSON") {
      lessonLineCount += 1;
      totalMinutes += Number(line.minutes || 0);
      grossAmount = grossAmount.plus(amount);
    } else if (line.type === "FIXED_SALARY") {
      fixedSalaryAmount = fixedSalaryAmount.plus(amount);
      grossAmount = grossAmount.plus(amount);
    } else if (line.type === "ADVANCE_DEDUCTION") {
      advanceDeductionAmountSigned = advanceDeductionAmountSigned.plus(amount);
    } else if (line.type === "BONUS") {
      bonusAmount = bonusAmount.plus(amount);
    } else if (line.type === "PENALTY") {
      penaltyAmountSigned = penaltyAmountSigned.plus(amount);
    } else if (line.type === "MANUAL") {
      manualAmount = manualAmount.plus(amount);
    }
  }

  const penaltyAmount = penaltyAmountSigned.abs();
  const advanceDeductionAmount = advanceDeductionAmountSigned.abs();
  const adjustmentAmount = money(
    bonusAmount.plus(manualAmount).plus(penaltyAmountSigned).plus(advanceDeductionAmountSigned),
  );
  const rawPayableAmount = money(grossAmount.plus(adjustmentAmount));
  const payableAmount = rawPayableAmount.lte(DECIMAL_ZERO) ? DECIMAL_ZERO : rawPayableAmount;

  return {
    totalMinutes,
    totalHours: money(decimal(totalMinutes).div(60)),
    grossAmount: money(grossAmount),
    bonusAmount: money(bonusAmount),
    penaltyAmount: money(penaltyAmount),
    manualAmount: money(manualAmount),
    fixedSalaryAmount: money(fixedSalaryAmount),
    advanceDeductionAmount: money(advanceDeductionAmount),
    adjustmentAmount,
    payableAmount,
    lessonLineCount,
    lineCount,
  };
}

async function recalculatePayrollRunAggregates(tx, { payrollRunId }) {
  const run = await tx.payrollRun.findUnique({
    where: { id: payrollRunId },
    select: { id: true, organizationId: true },
  });
  if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");

  const items = await tx.payrollItem.findMany({
    where: { payrollRunId },
    select: { id: true, teacherId: true, employeeId: true, paidAmount: true },
  });
  const lines = await tx.payrollLine.findMany({
    where: { payrollRunId },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
      teacher: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
    },
  });

  const itemById = new Map(items.map((i) => [i.id, i]));
  const linesByItem = new Map();
  for (const line of lines) {
    if (!linesByItem.has(line.payrollItemId)) linesByItem.set(line.payrollItemId, []);
    linesByItem.get(line.payrollItemId).push(line);
  }

  let runGross = DECIMAL_ZERO;
  let runAdjustments = DECIMAL_ZERO;
  let runPayable = DECIMAL_ZERO;
  let teacherCount = 0;
  let sourceLessonsCount = 0;

  for (const [itemId, teacherLines] of linesByItem.entries()) {
    teacherCount += 1;
    const item = itemById.get(itemId);
    if (!item) throw new ApiError(500, "PAYROLL_ITEM_MISSING", "Payroll item topilmadi (data integrity)");
    const summary = buildItemSummaryFromLines(teacherLines);
    const personSnap = teacherLines[0]?.employee || teacherLines[0]?.teacher || null;
    const usernameSnap =
      teacherLines[0]?.employee?.user?.username ||
      teacherLines[0]?.teacher?.user?.username ||
      null;
    sourceLessonsCount += summary.lessonLineCount;
    runGross = runGross.plus(summary.grossAmount);
    runAdjustments = runAdjustments.plus(summary.adjustmentAmount);
    runPayable = runPayable.plus(summary.payableAmount);
    const normalizedPaidAmount = clampPaidAmountToPayable(item.paidAmount, summary.payableAmount);
    const paymentStatus = getPayrollItemPaymentStatus({
      paidAmount: normalizedPaidAmount,
      payableAmount: summary.payableAmount,
    });

    await tx.payrollItem.update({
      where: { id: item.id },
      data: {
        totalMinutes: summary.totalMinutes,
        totalHours: summary.totalHours,
        grossAmount: summary.grossAmount,
        bonusAmount: summary.bonusAmount,
        penaltyAmount: summary.penaltyAmount,
        manualAmount: summary.manualAmount,
        fixedSalaryAmount: summary.fixedSalaryAmount,
        advanceDeductionAmount: summary.advanceDeductionAmount,
        adjustmentAmount: summary.adjustmentAmount,
        payableAmount: summary.payableAmount,
        paidAmount: normalizedPaidAmount,
        paymentStatus,
        lessonLineCount: summary.lessonLineCount,
        lineCount: summary.lineCount,
        teacherFirstNameSnapshot: personSnap?.firstName || null,
        teacherLastNameSnapshot: personSnap?.lastName || null,
        teacherUsernameSnapshot: usernameSnap,
        summarySnapshot: {
          totalMinutes: summary.totalMinutes,
          totalHours: String(summary.totalHours),
          grossAmount: String(summary.grossAmount),
          bonusAmount: String(summary.bonusAmount),
          penaltyAmount: String(summary.penaltyAmount),
          manualAmount: String(summary.manualAmount),
          fixedSalaryAmount: String(summary.fixedSalaryAmount),
          advanceDeductionAmount: String(summary.advanceDeductionAmount),
          adjustmentAmount: String(summary.adjustmentAmount),
          payableAmount: String(summary.payableAmount),
          paidAmount: String(normalizedPaidAmount),
          paymentStatus,
          lessonLineCount: summary.lessonLineCount,
          lineCount: summary.lineCount,
        },
      },
    });
  }

  const itemIdsWithLines = [...linesByItem.keys()];
  await tx.payrollItem.deleteMany({
    where: {
      payrollRunId,
      ...(itemIdsWithLines.length ? { id: { notIn: itemIdsWithLines } } : {}),
    },
  });

  await tx.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      sourceLessonsCount,
      teacherCount,
      grossAmount: money(runGross),
      adjustmentAmount: money(runAdjustments),
      payableAmount: money(runPayable),
    },
  });
}

async function getActiveRunForPeriod(tx, { organizationId, periodMonth }) {
  const runs = await tx.payrollRun.findMany({
    where: {
      organizationId,
      periodMonth,
      status: { in: ACTIVE_PAYROLL_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  if (runs.length > 1) {
    throw new ApiError(
      409,
      "PAYROLL_RUN_PERIOD_CONFLICT",
      "Bir oy uchun bir nechta aktiv payroll run topildi. Data integrity tekshiring",
    );
  }
  return runs[0] || null;
}

function decimalToNumber(value) {
  if (value == null) return 0;
  if (value instanceof Prisma.Decimal) return Number(value.toString());
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutesToRoundedHours(minutes) {
  const value = Number(minutes || 0) / 60;
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function incrementMapNumber(map, key, delta) {
  if (!key) return;
  const prev = Number(map.get(key) || 0);
  map.set(key, prev + Number(delta || 0));
}

function buildTeacherDirectoryRows(rows) {
  return new Map(
    (rows || []).map((row) => [row.id, {
      id: row.id,
      firstName: row.firstName || null,
      lastName: row.lastName || null,
      user: row.user ? { username: row.user.username } : null,
      employeeId: row.employeeId || null,
    }]),
  );
}

async function collectPayrollPeriodDiagnosticsTx(
  tx,
  { organizationId, periodMonth, periodStart, periodEnd, includeDetails = false },
) {
  const oquvYili = getAcademicYearFromPeriodMonth(periodMonth);
  const weekdayOccurrences = weekdayOccurrencesForPeriodMonth(periodMonth);

  const [lessons, teacherEmployees, activeTeachers, scheduleRows, workloadPlans, periodRuns] = await Promise.all([
    tx.realLesson.findMany({
      where: {
        organizationId,
        status: { in: ["DONE", "REPLACED"] },
        startAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        teacherId: true,
        status: true,
        replacedByTeacherId: true,
        subjectId: true,
        classroomId: true,
        startAt: true,
        durationMinutes: true,
      },
    }),
    tx.employee.findMany({
      where: {
        organizationId,
        kind: "TEACHER",
      },
      select: {
        id: true,
        payrollMode: true,
        employmentStatus: true,
        isPayrollEligible: true,
        fixedSalaryAmount: true,
        teacher: { select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } } },
        user: { select: { username: true, isActive: true } },
      },
    }),
    tx.teacher.findMany({
      where: {
        user: { is: { isActive: true } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        user: { select: { username: true } },
      },
    }),
    tx.darsJadvali.findMany({
      where: {
        oquvYili,
        sinf: { isArchived: false },
      },
      select: {
        id: true,
        oqituvchiId: true,
        haftaKuni: true,
        vaqtOraliq: { select: { boshlanishVaqti: true, tugashVaqti: true } },
      },
    }),
    tx.teacherWorkloadPlan.findMany({
      where: { oquvYili },
      select: { id: true, teacherId: true, weeklyMinutesLimit: true, note: true },
    }),
    tx.payrollRun.findMany({
      where: {
        organizationId,
        periodMonth,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        createdAt: true,
        generatedAt: true,
        approvedAt: true,
        paidAt: true,
        payableAmount: true,
        grossAmount: true,
        adjustmentAmount: true,
      },
    }),
  ]);

  const plannedWeeklyMinutesByTeacher = new Map();
  const plannedMonthlyMinutesByTeacher = new Map();
  const invalidScheduleRows = [];
  for (const row of scheduleRows) {
    const duration = getSlotDurationMinutes(row.vaqtOraliq);
    const weekday = HAFTA_KUNI_TO_WEEKDAY[row.haftaKuni];
    if (!duration || weekday === undefined) {
      invalidScheduleRows.push({
        darsJadvaliId: row.id,
        teacherId: row.oqituvchiId,
        haftaKuni: row.haftaKuni,
      });
      continue;
    }
    incrementMapNumber(plannedWeeklyMinutesByTeacher, row.oqituvchiId, duration);
    incrementMapNumber(
      plannedMonthlyMinutesByTeacher,
      row.oqituvchiId,
      duration * Number(weekdayOccurrences[weekday] || 0),
    );
  }

  const { teacherMap, subjectMap } = await loadRatesForPeriod(tx, {
    organizationId,
    lessons,
    periodStart,
    periodEnd,
  });
  const lessonEligibilityByTeacherId = new Map(
    teacherEmployees
      .filter((row) => row.teacher?.id)
      .map((row) => [row.teacher.id, isEmployeeLessonPayrollEligible(row)]),
  );

  const actualMinutesByTeacher = new Map();
  const lessonCountByTeacher = new Map();
  const missingRateLessons = [];
  const invalidReplacedLessons = [];
  for (const lesson of lessons) {
    let payrollTeacherId = null;
    try {
      payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
    } catch (error) {
      if (error instanceof ApiError && error.code === "REAL_LESSON_REPLACED_TEACHER_REQUIRED") {
        invalidReplacedLessons.push({
          realLessonId: lesson.id,
          teacherId: lesson.teacherId,
          replacedByTeacherId: lesson.replacedByTeacherId || null,
          status: lesson.status,
          subjectId: lesson.subjectId,
          startAt: lesson.startAt,
        });
        continue;
      }
      throw error;
    }

    // Payrolldan chiqarilgan / nofaol xodim darslari rate blocker hisoblanmaydi.
    if (lessonEligibilityByTeacherId.get(payrollTeacherId) === false) {
      continue;
    }

    incrementMapNumber(actualMinutesByTeacher, payrollTeacherId, Number(lesson.durationMinutes || 0));
    incrementMapNumber(lessonCountByTeacher, payrollTeacherId, 1);

    const resolved = resolveRateForLesson({
      lesson: { ...lesson, teacherId: payrollTeacherId },
      teacherRateMap: teacherMap,
      subjectDefaultRateMap: subjectMap,
    });
    if (!resolved) {
      missingRateLessons.push({
        realLessonId: lesson.id,
        teacherId: payrollTeacherId,
        sourceTeacherId: lesson.teacherId,
        replacedByTeacherId: lesson.replacedByTeacherId || null,
        subjectId: lesson.subjectId,
        classroomId: lesson.classroomId,
        status: lesson.status,
        startAt: lesson.startAt,
      });
    }
  }

  const planByTeacher = new Map(workloadPlans.map((plan) => [plan.teacherId, plan]));
  const missingWorkloadPlanTeachers = [];
  const overloadedTeachers = [];
  for (const [teacherId, weeklyMinutes] of plannedWeeklyMinutesByTeacher.entries()) {
    const plan = planByTeacher.get(teacherId);
    if (!plan) {
      missingWorkloadPlanTeachers.push({ teacherId, plannedWeeklyMinutes: weeklyMinutes });
      continue;
    }
    if (Number(weeklyMinutes) > Number(plan.weeklyMinutesLimit || 0)) {
      overloadedTeachers.push({
        teacherId,
        plannedWeeklyMinutes: weeklyMinutes,
        limitWeeklyMinutes: Number(plan.weeklyMinutesLimit || 0),
      });
    }
  }

  const invalidFixedSalaryEmployees = [];
  for (const employee of teacherEmployees) {
    if (!employee.isPayrollEligible) continue;
    if (employee.employmentStatus !== "ACTIVE") continue;
    if (!["FIXED", "MIXED"].includes(employee.payrollMode)) continue;
    const fixedSalary = decimal(employee.fixedSalaryAmount);
    if (fixedSalary.lte(DECIMAL_ZERO)) {
      invalidFixedSalaryEmployees.push({
        employeeId: employee.id,
        teacherId: employee.teacher?.id || null,
        payrollMode: employee.payrollMode,
        fixedSalaryAmount: employee.fixedSalaryAmount,
      });
    }
  }

  const activeRuns = periodRuns.filter((run) => ACTIVE_PAYROLL_STATUSES.includes(run.status));
  const activeRunConflict = activeRuns.length > 1;
  const activeRun = activeRuns[0] || null;
  const lockedRun = activeRun && activeRun.status !== "DRAFT" ? activeRun : null;

  const teacherIdsInScope = new Set();
  for (const row of activeTeachers) teacherIdsInScope.add(row.id);
  for (const key of plannedWeeklyMinutesByTeacher.keys()) teacherIdsInScope.add(key);
  for (const key of plannedMonthlyMinutesByTeacher.keys()) teacherIdsInScope.add(key);
  for (const key of actualMinutesByTeacher.keys()) teacherIdsInScope.add(key);
  for (const key of lessonCountByTeacher.keys()) teacherIdsInScope.add(key);
  for (const row of missingRateLessons) teacherIdsInScope.add(row.teacherId);
  for (const row of missingWorkloadPlanTeachers) teacherIdsInScope.add(row.teacherId);
  for (const row of overloadedTeachers) teacherIdsInScope.add(row.teacherId);
  for (const row of invalidFixedSalaryEmployees) {
    if (row.teacherId) teacherIdsInScope.add(row.teacherId);
  }

  let teacherDirectory = buildTeacherDirectoryRows(activeTeachers);
  const missingDirectoryTeacherIds = [...teacherIdsInScope].filter((teacherId) => teacherId && !teacherDirectory.has(teacherId));
  if (missingDirectoryTeacherIds.length) {
    const extraTeachers = await tx.teacher.findMany({
      where: { id: { in: missingDirectoryTeacherIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        user: { select: { username: true } },
      },
    });
    teacherDirectory = new Map([...teacherDirectory, ...buildTeacherDirectoryRows(extraTeachers)]);
  }

  const teacherMetrics = [...teacherIdsInScope]
    .filter(Boolean)
    .map((teacherId) => {
      const teacher = teacherDirectory.get(teacherId) || { id: teacherId };
      const plannedWeeklyMinutes = Number(plannedWeeklyMinutesByTeacher.get(teacherId) || 0);
      const plannedMonthlyMinutes = Number(plannedMonthlyMinutesByTeacher.get(teacherId) || 0);
      const actualMonthlyMinutes = Number(actualMinutesByTeacher.get(teacherId) || 0);
      const lessonCount = Number(lessonCountByTeacher.get(teacherId) || 0);
      const plan = planByTeacher.get(teacherId) || null;
      return {
        teacherId,
        teacherName: teacherDisplayLabel(teacher) || teacherId,
        username: teacher.user?.username || null,
        plannedWeeklyMinutes,
        plannedWeeklyHours: minutesToRoundedHours(plannedWeeklyMinutes),
        plannedMonthlyMinutes,
        plannedMonthlyHours: minutesToRoundedHours(plannedMonthlyMinutes),
        actualMonthlyMinutes,
        actualMonthlyHours: minutesToRoundedHours(actualMonthlyMinutes),
        monthlyDeltaMinutes: actualMonthlyMinutes - plannedMonthlyMinutes,
        monthlyDeltaHours: minutesToRoundedHours(actualMonthlyMinutes - plannedMonthlyMinutes),
        lessonCount,
        weeklyPlanMinutes: plan ? Number(plan.weeklyMinutesLimit || 0) : null,
        weeklyPlanHours: plan ? minutesToRoundedHours(plan.weeklyMinutesLimit) : null,
        hasWorkloadPlan: Boolean(plan),
      };
    })
    .sort((a, b) => {
      const byActual = b.actualMonthlyMinutes - a.actualMonthlyMinutes;
      if (byActual !== 0) return byActual;
      return String(a.teacherName || "").localeCompare(String(b.teacherName || ""));
    });

  const teacherSnapshot = (teacherId) => {
    const teacher = teacherDirectory.get(teacherId) || { id: teacherId };
    return {
      teacherId,
      teacherName: teacherDisplayLabel(teacher) || teacherId || "-",
      username: teacher.user?.username || null,
    };
  };

  const blockers = [];
  const warnings = [];

  if (activeRunConflict) {
    blockers.push({
      code: "PAYROLL_RUN_PERIOD_CONFLICT",
      message: "Bir oy uchun bir nechta aktiv payroll run topildi",
      count: activeRuns.length,
      sample: activeRuns.slice(0, 20).map((run) => ({ runId: run.id, status: run.status })),
    });
  }
  if (invalidReplacedLessons.length) {
    blockers.push({
      code: "REAL_LESSON_REPLACED_TEACHER_REQUIRED",
      message: "REPLACED statusdagi ayrim real lessonlarda replacement teacher kiritilmagan",
      count: invalidReplacedLessons.length,
      sample: invalidReplacedLessons.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        realLessonId: row.realLessonId,
        status: row.status,
        startAt: row.startAt,
      })),
    });
  }
  if (missingRateLessons.length) {
    blockers.push({
      code: "PAYROLL_RATE_NOT_FOUND",
      message: "Ba'zi darslar uchun rate topilmadi",
      count: missingRateLessons.length,
      sample: missingRateLessons.slice(0, 30).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        realLessonId: row.realLessonId,
        subjectId: row.subjectId,
        status: row.status,
        startAt: row.startAt,
      })),
    });
  }
  if (invalidFixedSalaryEmployees.length) {
    blockers.push({
      code: "PAYROLL_FIXED_SALARY_REQUIRED",
      message: "FIXED/MIXED rejimdagi ayrim xodimlarda oklad summasi 0 yoki bo'sh",
      count: invalidFixedSalaryEmployees.length,
      sample: invalidFixedSalaryEmployees.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        employeeId: row.employeeId,
        payrollMode: row.payrollMode,
      })),
    });
  }

  if (lockedRun) {
    warnings.push({
      code: "PAYROLL_RUN_LOCKED",
      message: `Bu oy uchun run ${lockedRun.status} holatida. Generate/advance sync cheklangan`,
      count: 1,
      sample: [{ runId: lockedRun.id, status: lockedRun.status }],
    });
  }
  if (missingWorkloadPlanTeachers.length) {
    warnings.push({
      code: "TEACHER_WEEKLY_PLAN_REQUIRED",
      message: "Ba'zi o'qituvchilar uchun haftalik yuklama plani yo'q",
      count: missingWorkloadPlanTeachers.length,
      sample: missingWorkloadPlanTeachers.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        plannedWeeklyMinutes: row.plannedWeeklyMinutes,
      })),
    });
  }
  if (overloadedTeachers.length) {
    warnings.push({
      code: "TEACHER_WEEKLY_HOURS_EXCEEDED",
      message: "Ba'zi o'qituvchilarda haftalik jadval yuklama limitidan oshgan",
      count: overloadedTeachers.length,
      sample: overloadedTeachers.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        plannedWeeklyMinutes: row.plannedWeeklyMinutes,
        limitWeeklyMinutes: row.limitWeeklyMinutes,
      })),
    });
  }
  if (invalidScheduleRows.length) {
    warnings.push({
      code: "SCHEDULE_SLOT_INVALID",
      message: "Ayrim jadval qatorlarida vaqt oralig'i noto'g'ri",
      count: invalidScheduleRows.length,
      sample: invalidScheduleRows.slice(0, 20).map((row) => ({
        darsJadvaliId: row.darsJadvaliId,
        teacherId: row.teacherId,
        haftaKuni: row.haftaKuni,
      })),
    });
  }

  const blockingCodes = new Set(blockers.map((row) => row.code));
  const readyForGenerate = blockers.length === 0 && !lockedRun;
  const readyForAutoProcess = blockers.length === 0 && !activeRunConflict;

  const response = {
    periodMonth,
    oquvYili,
    summary: {
      blockerCount: blockers.length,
      warningCount: warnings.length,
      readyForGenerate,
      readyForAutoProcess,
      blockingCodes: [...blockingCodes],
    },
    metrics: {
      activeTeacherCount: activeTeachers.length,
      realLessonCount: lessons.length,
      scheduleRowCount: scheduleRows.length,
      missingRateLessonCount: missingRateLessons.length,
      invalidReplacedLessonCount: invalidReplacedLessons.length,
      invalidFixedSalaryConfigCount: invalidFixedSalaryEmployees.length,
      missingWorkloadPlanCount: missingWorkloadPlanTeachers.length,
      overloadedTeacherCount: overloadedTeachers.length,
      invalidScheduleSlotCount: invalidScheduleRows.length,
      activeRunCount: activeRuns.length,
    },
    currentRun: activeRun
      ? {
          id: activeRun.id,
          status: activeRun.status,
          createdAt: activeRun.createdAt,
          generatedAt: activeRun.generatedAt,
          approvedAt: activeRun.approvedAt,
          paidAt: activeRun.paidAt,
          grossAmount: activeRun.grossAmount,
          adjustmentAmount: activeRun.adjustmentAmount,
          payableAmount: activeRun.payableAmount,
        }
      : null,
    blockers,
    warnings,
    teacherMetrics,
  };

  if (!includeDetails) {
    for (const issue of [...response.blockers, ...response.warnings]) {
      if (issue.sample && issue.sample.length > 5) {
        issue.sample = issue.sample.slice(0, 5);
      }
    }
    if (response.teacherMetrics.length > 50) {
      response.teacherMetrics = response.teacherMetrics.slice(0, 50);
    }
  }

  return response;
}

function periodMonthFromLessonStart(startAt) {
  const localDate = utcDateToTashkentIsoDate(startAt);
  const periodMonth = String(localDate || "").slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "RealLesson sanasidan periodMonth ajratib bo'lmadi");
  }
  return periodMonth;
}

async function refreshDraftPayrollForLesson({ lessonId, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const lesson = await tx.realLesson.findFirst({
      where: { id: lessonId, organizationId: org.id },
      select: {
        id: true,
        teacherId: true,
        status: true,
        replacedByTeacherId: true,
        subjectId: true,
        classroomId: true,
        startAt: true,
        durationMinutes: true,
        teacher: { select: { userId: true } },
      },
    });
    if (!lesson) throw new ApiError(404, "REAL_LESSON_NOT_FOUND", "Real lesson topilmadi");

    const periodMonth = periodMonthFromLessonStart(lesson.startAt);
    const { periodStart, periodEnd } = monthKeyToUtcRange(periodMonth);
    const lessonEligible = lesson.status === "DONE" || lesson.status === "REPLACED";

    // Org-level lock to avoid duplicate run/line writes in parallel refresh calls.
    await tx.$executeRaw`SELECT id FROM "Organization" WHERE id = ${org.id} FOR UPDATE`;

    let run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    if (!run && !lessonEligible) {
      return {
        runId: null,
        periodMonth,
        lessonId: lesson.id,
        refreshed: false,
        skipped: true,
        reason: "LESSON_NOT_PAYROLL_ELIGIBLE",
      };
    }

    if (!run) {
      const createdByUserId = actorUserId || lesson.teacher?.userId || null;
      if (!createdByUserId) {
        throw new ApiError(
          400,
          "PAYROLL_RUN_ACTOR_REQUIRED",
          "Payroll run yaratish uchun actorUserId topilmadi",
        );
      }
      run = await tx.payrollRun.create({
        data: {
          organizationId: org.id,
          periodMonth,
          periodStart,
          periodEnd,
          timezone: "Asia/Tashkent",
          status: "DRAFT",
          createdByUserId,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId: createdByUserId,
        action: "PAYROLL_RUN_CREATE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        after: { periodMonth, periodStart, periodEnd, status: "DRAFT" },
        req,
      });
    }

    const existingLine = await tx.payrollLine.findFirst({
      where: { payrollRunId: run.id, realLessonId: lesson.id },
      select: { id: true },
    });

    let linePayload = null;
    if (lessonEligible) {
      const payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
      const owner = await ensureEmployeeForTeacher(tx, {
        teacherId: payrollTeacherId,
        organizationId: org.id,
      });

      // Lesson payroll faqat ACTIVE + eligible + LESSON_BASED/MIXED xodimlarda yuradi.
      if (isEmployeeLessonPayrollEligible(owner.employee)) {
        const { teacherMap, subjectMap } = await loadRatesForPeriod(tx, {
          organizationId: org.id,
          lessons: [lesson],
          periodStart,
          periodEnd,
        });
        const resolved = resolveRateForLesson({
          lesson: { ...lesson, teacherId: payrollTeacherId },
          teacherRateMap: teacherMap,
          subjectDefaultRateMap: subjectMap,
        });
        if (!resolved) {
          throw new ApiError(
            409,
            "PAYROLL_RATE_NOT_FOUND",
            "Dars uchun rate topilmadi. Avval rate kiriting",
            {
              totalMissing: 1,
              missingRateLessons: [
                {
                  realLessonId: lesson.id,
                  teacherId: payrollTeacherId,
                  sourceTeacherId: lesson.teacherId,
                  status: lesson.status,
                  replacedByTeacherId: lesson.replacedByTeacherId || null,
                  subjectId: lesson.subjectId,
                  classroomId: lesson.classroomId,
                  startAt: lesson.startAt,
                },
              ],
            },
          );
        }
        const item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          teacherId: payrollTeacherId,
          employeeId: owner.employee.id,
        });
        const amount = calcLessonAmount(resolved.ratePerHour, lesson.durationMinutes);
        linePayload = {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          employeeId: owner.employee.id,
          teacherId: payrollTeacherId,
          type: "LESSON",
          realLessonId: lesson.id,
          subjectId: lesson.subjectId,
          classroomId: lesson.classroomId,
          lessonStartAt: lesson.startAt,
          minutes: lesson.durationMinutes,
          ratePerHour: resolved.ratePerHour,
          amount,
          rateSource: resolved.rateSource,
          teacherRateId: resolved.teacherRateId,
          subjectDefaultRateId: resolved.subjectDefaultRateId,
          createdByUserId: actorUserId || null,
          meta: {
            resolution: { rateSource: resolved.rateSource },
            sourceTeacherId: lesson.teacherId,
            lessonStatus: lesson.status,
            replacedByTeacherId: lesson.replacedByTeacherId || null,
          },
        };
      }
    }

    if (existingLine) {
      await tx.payrollLine.delete({
        where: { id: existingLine.id },
      });
    }
    if (linePayload) {
      await tx.payrollLine.create({ data: linePayload });
    }

    await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });

    const beforeGeneratedAt = run.generatedAt;
    const now = new Date();
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        generatedAt: now,
        generationSummary: {
          mode: "INCREMENTAL_LESSON_REFRESH",
          periodMonth,
          lessonId: lesson.id,
          refreshedAt: now.toISOString(),
        },
        ...(beforeGeneratedAt ? { calcVersion: { increment: 1 } } : {}),
      },
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId: actorUserId || null,
      action: "PAYROLL_RUN_REFRESH_LESSON",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: {
        generatedAt: beforeGeneratedAt || null,
        hadExistingLine: Boolean(existingLine),
      },
      after: {
        generatedAt: now,
        lessonId: lesson.id,
        lessonStatus: lesson.status,
        lineUpserted: Boolean(linePayload),
      },
      req,
    });

    return {
      runId: run.id,
      periodMonth,
      lessonId: lesson.id,
      refreshed: true,
      skipped: false,
      reason: null,
    };
  });
}

async function generatePayrollRun({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const { periodMonth, periodStart, periodEnd } = monthKeyToUtcRange(body.periodMonth);

    // Parallel generate chaqiriqlarida bitta oyga duplicate run ochilib ketmasligi uchun org-level lock.
    await tx.$executeRaw`SELECT id FROM "Organization" WHERE id = ${org.id} FOR UPDATE`;

    let run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    if (!run) {
      const runActorUserId = await resolvePayrollRunActorUserId(tx, actorUserId);
      run = await tx.payrollRun.create({
        data: {
          organizationId: org.id,
          periodMonth,
          periodStart,
          periodEnd,
          timezone: "Asia/Tashkent",
          status: "DRAFT",
          createdByUserId: runActorUserId,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId: runActorUserId,
        action: "PAYROLL_RUN_CREATE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        after: { periodMonth, periodStart, periodEnd, status: "DRAFT" },
        req,
      });
    }

    await tx.payrollLine.deleteMany({
      where: { payrollRunId: run.id, type: { in: REGENERATE_LINE_TYPES } },
    });

    const lessons = await tx.realLesson.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["DONE", "REPLACED"] },
        startAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        teacherId: true,
        status: true,
        replacedByTeacherId: true,
        subjectId: true,
        classroomId: true,
        startAt: true,
        durationMinutes: true,
      },
    });

    const { teacherMap, subjectMap } = await loadRatesForPeriod(tx, {
      organizationId: org.id,
      lessons,
      periodStart,
      periodEnd,
    });

    const teacherEmployeeCache = new Map();
    const getLessonOwner = async (payrollTeacherId) => {
      let owner = teacherEmployeeCache.get(payrollTeacherId);
      if (!owner) {
        owner = await ensureEmployeeForTeacher(tx, {
          teacherId: payrollTeacherId,
          organizationId: org.id,
        });
        teacherEmployeeCache.set(payrollTeacherId, owner);
      }
      return owner;
    };

    const missingRateLessons = [];
    for (const lesson of lessons) {
      const payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
      const owner = await getLessonOwner(payrollTeacherId);
      if (!isEmployeeLessonPayrollEligible(owner.employee)) continue;

      const resolved = resolveRateForLesson({
        lesson: { ...lesson, teacherId: payrollTeacherId },
        teacherRateMap: teacherMap,
        subjectDefaultRateMap: subjectMap,
      });
      if (!resolved) {
        missingRateLessons.push({
          realLessonId: lesson.id,
          teacherId: payrollTeacherId,
          sourceTeacherId: lesson.teacherId,
          status: lesson.status,
          replacedByTeacherId: lesson.replacedByTeacherId || null,
          subjectId: lesson.subjectId,
          classroomId: lesson.classroomId,
          startAt: lesson.startAt,
        });
      }
    }
    if (missingRateLessons.length) {
      throw new ApiError(
        409,
        "PAYROLL_RATE_NOT_FOUND",
        "Ba'zi darslar uchun rate topilmadi. Avval rate kiriting",
        { totalMissing: missingRateLessons.length, missingRateLessons: missingRateLessons.slice(0, 100) },
      );
    }

    const existingItems = await tx.payrollItem.findMany({
      where: { payrollRunId: run.id },
      select: { id: true, teacherId: true, employeeId: true },
    });
    const itemByTeacherCache = new Map(
      existingItems
        .filter((r) => r.teacherId)
        .map((r) => [r.teacherId, r]),
    );
    const itemByEmployeeCache = new Map(
      existingItems
        .filter((r) => r.employeeId)
        .map((r) => [r.employeeId, r]),
    );
    const setItemCache = (item) => {
      if (item?.teacherId) itemByTeacherCache.set(item.teacherId, item);
      if (item?.employeeId) itemByEmployeeCache.set(item.employeeId, item);
    };

    const lessonLineRows = [];
    for (const lesson of lessons) {
      const payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
      const owner = await getLessonOwner(payrollTeacherId);
      if (!isEmployeeLessonPayrollEligible(owner.employee)) continue;

      let item = itemByTeacherCache.get(payrollTeacherId) || itemByEmployeeCache.get(owner.employee.id);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          teacherId: payrollTeacherId,
          employeeId: owner.employee.id,
        });
        setItemCache(item);
      } else if (!item.employeeId || item.employeeId !== owner.employee.id || item.teacherId !== payrollTeacherId) {
        const patch = {};
        if (!item.employeeId || item.employeeId !== owner.employee.id) patch.employeeId = owner.employee.id;
        if (item.teacherId !== payrollTeacherId) patch.teacherId = payrollTeacherId;
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
        setItemCache(item);
      }

      const resolved = resolveRateForLesson({
        lesson: { ...lesson, teacherId: payrollTeacherId },
        teacherRateMap: teacherMap,
        subjectDefaultRateMap: subjectMap,
      });
      const amount = calcLessonAmount(resolved.ratePerHour, lesson.durationMinutes);
      lessonLineRows.push({
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: owner.employee.id,
        teacherId: payrollTeacherId,
        type: "LESSON",
        realLessonId: lesson.id,
        subjectId: lesson.subjectId,
        classroomId: lesson.classroomId,
        lessonStartAt: lesson.startAt,
        minutes: lesson.durationMinutes,
        ratePerHour: resolved.ratePerHour,
        amount,
        rateSource: resolved.rateSource,
        teacherRateId: resolved.teacherRateId,
        subjectDefaultRateId: resolved.subjectDefaultRateId,
        createdByUserId: actorUserId || null,
        meta: {
          resolution: { rateSource: resolved.rateSource },
          sourceTeacherId: lesson.teacherId,
          lessonStatus: lesson.status,
          replacedByTeacherId: lesson.replacedByTeacherId || null,
        },
      });
    }
    if (lessonLineRows.length) {
      await tx.payrollLine.createMany({ data: lessonLineRows });
    }

    const fixedSalaryEmployees = await tx.employee.findMany({
      where: {
        organizationId: org.id,
        isPayrollEligible: true,
        employmentStatus: "ACTIVE",
        payrollMode: { in: ["FIXED", "MIXED"] },
        fixedSalaryAmount: { gt: DECIMAL_ZERO },
        AND: [
          { OR: [{ hireDate: null }, { hireDate: { lt: periodEnd } }] },
          { OR: [{ terminationDate: null }, { terminationDate: { gte: periodStart } }] },
        ],
      },
      select: {
        id: true,
        fixedSalaryAmount: true,
        teacher: { select: { id: true } },
      },
    });

    for (const employee of fixedSalaryEmployees) {
      const teacherId = employee.teacher?.id || null;
      let item = itemByEmployeeCache.get(employee.id) || (teacherId ? itemByTeacherCache.get(teacherId) : null);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          employeeId: employee.id,
          teacherId,
        });
        setItemCache(item);
      } else if ((!item.employeeId || item.employeeId !== employee.id) || (teacherId && item.teacherId !== teacherId)) {
        const patch = {};
        if (!item.employeeId || item.employeeId !== employee.id) patch.employeeId = employee.id;
        if (teacherId && item.teacherId !== teacherId) patch.teacherId = teacherId;
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
        setItemCache(item);
      }

      await tx.payrollLine.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          employeeId: employee.id,
          teacherId,
          type: "FIXED_SALARY",
          amount: money(employee.fixedSalaryAmount),
          description: "Oylik oklad",
          createdByUserId: actorUserId || null,
          meta: { source: "EMPLOYEE_FIXED_SALARY" },
        },
      });
    }

    const advances = await tx.advancePayment.findMany({
      where: {
        organizationId: org.id,
        periodMonth,
      },
      select: {
        id: true,
        employeeId: true,
        teacherId: true,
        amount: true,
        note: true,
        paidAt: true,
      },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    });

    for (const advance of advances) {
      const teacherId = advance.teacherId || null;
      let item = itemByEmployeeCache.get(advance.employeeId) || (teacherId ? itemByTeacherCache.get(teacherId) : null);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          employeeId: advance.employeeId,
          teacherId,
        });
        setItemCache(item);
      } else if ((!item.employeeId || item.employeeId !== advance.employeeId) || (teacherId && item.teacherId !== teacherId)) {
        const patch = {};
        if (!item.employeeId || item.employeeId !== advance.employeeId) patch.employeeId = advance.employeeId;
        if (teacherId && item.teacherId !== teacherId) patch.teacherId = teacherId;
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
        setItemCache(item);
      }

      await tx.payrollLine.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          employeeId: advance.employeeId,
          teacherId,
          type: "ADVANCE_DEDUCTION",
          advancePaymentId: advance.id,
          amount: money(advance.amount).neg(),
          description: cleanOptional(advance.note) || "Avans ushlanmasi",
          createdByUserId: actorUserId || null,
          meta: {
            source: "ADVANCE_PAYMENT",
            advancePaymentId: advance.id,
            periodMonth,
            paidAt: advance.paidAt,
          },
        },
      });
    }

    await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });

    const beforeGeneratedAt = run.generatedAt;
    const now = new Date();
    const lessonLinesCreated = lessonLineRows.length;
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        generatedAt: now,
        generationSummary: {
          periodMonth,
          lessonCount: lessonLinesCreated,
          fixedSalaryCount: fixedSalaryEmployees.length,
          advanceCount: advances.length,
          generatedAt: now.toISOString(),
        },
        ...(beforeGeneratedAt ? { calcVersion: { increment: 1 } } : {}),
      },
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_GENERATE",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status, generatedAt: beforeGeneratedAt || null },
      after: { status: "DRAFT", lessonCount: lessonLinesCreated },
      req,
    });

    const freshRun = await tx.payrollRun.findUnique({
      where: { id: run.id },
      include: {
        items: {
          orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
          include: {
            employee: {
              select: {
                id: true,
                kind: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
    });

    return {
      run: freshRun,
      generation: { lessonsProcessed: lessonLinesCreated },
    };
  });
}

async function listPayrollRuns({ query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = { organizationId: org.id };
    if (query.periodMonth) where.periodMonth = query.periodMonth;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      tx.payrollRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
        include: {
          createdByUser: { select: { id: true, username: true } },
          approvedByUser: { select: { id: true, username: true } },
          paidByUser: { select: { id: true, username: true } },
          reversedByUser: { select: { id: true, username: true } },
        },
      }),
      tx.payrollRun.count({ where }),
    ]);

    return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), runs: items };
  });
}

async function getPayrollRunOrThrow(tx, { runId, organizationId }) {
  const run = await tx.payrollRun.findFirst({
    where: { id: runId, organizationId },
  });
  if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");
  return run;
}

async function lockPayrollRunRow(tx, { runId, organizationId }) {
  await tx.$executeRaw`
    SELECT id
    FROM "PayrollRun"
    WHERE id = ${runId} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
}

async function lockPayrollItemRow(tx, { itemId, runId, organizationId }) {
  await tx.$executeRaw`
    SELECT id
    FROM "PayrollItem"
    WHERE id = ${itemId}
      AND "payrollRunId" = ${runId}
      AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
}

function assertRunStatus(run, allowed) {
  if (!allowed.includes(run.status)) {
    throw new ApiError(
      409,
      "PAYROLL_INVALID_STATE",
      `Bu amal faqat ${allowed.join(", ")} holatida mumkin (hozir: ${run.status})`,
      { currentStatus: run.status, allowed },
    );
  }
}

async function getPayrollRunDetail({ runId, query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 50), 200);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, organizationId: org.id },
      include: {
        createdByUser: { select: { id: true, username: true } },
        approvedByUser: { select: { id: true, username: true } },
        paidByUser: { select: { id: true, username: true } },
        reversedByUser: { select: { id: true, username: true } },
        items: {
          orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
          include: {
            employee: {
              select: {
                id: true,
                kind: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
    });
    if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");

    const linesWhere = { payrollRunId: run.id };
    if (query.teacherId) linesWhere.teacherId = query.teacherId;
    if (query.employeeId) linesWhere.employeeId = query.employeeId;
    if (query.type) linesWhere.type = query.type;

    const [items, total] = await Promise.all([
      tx.payrollLine.findMany({
        where: linesWhere,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          employee: {
            select: { id: true, kind: true, firstName: true, lastName: true, user: { select: { username: true } } },
          },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
        },
      }),
      tx.payrollLine.count({ where: linesWhere }),
    ]);

    const lessonLineGroups = await tx.payrollLine.groupBy({
      where: {
        payrollRunId: run.id,
        type: "LESSON",
      },
      by: ["payrollItemId", "subjectId", "ratePerHour"],
      _sum: {
        minutes: true,
        amount: true,
      },
      _count: {
        _all: true,
      },
    });
    const subjectIds = [...new Set(lessonLineGroups.map((row) => row.subjectId).filter(Boolean))];
    const subjects = subjectIds.length
      ? await tx.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : [];
    const subjectById = new Map(subjects.map((row) => [row.id, row]));
    const lessonBreakdownByItemId = new Map();
    for (const group of lessonLineGroups) {
      const subjectName = subjectById.get(group.subjectId)?.name || group.subjectId || "-";
      const minutes = Number(group._sum.minutes || 0);
      const row = {
        subjectId: group.subjectId || null,
        subjectName,
        ratePerHour: group.ratePerHour,
        lessonMinutes: minutes,
        lessonHours: money(decimal(minutes).div(60)),
        amount: money(group._sum.amount || 0),
        lessonCount: Number(group._count?._all || 0),
      };
      const bucket = lessonBreakdownByItemId.get(group.payrollItemId) || [];
      bucket.push(row);
      lessonBreakdownByItemId.set(group.payrollItemId, bucket);
    }

    const runWithBreakdown = {
      ...run,
      items: (run.items || []).map((item) => {
        const subjectBreakdown = (lessonBreakdownByItemId.get(item.id) || [])
          .slice()
          .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        const primarySubject = subjectBreakdown[0] || null;
        return {
          ...item,
          subjectBreakdown,
          primarySubjectName: primarySubject?.subjectName || null,
          primaryRatePerHour: primarySubject?.ratePerHour || null,
        };
      }),
    };

    return {
      run: runWithBreakdown,
      lines: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        items,
      },
    };
  });
}

async function exportPayrollRunCsv({ runId, query }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, organizationId: org.id },
      include: {
        items: {
          orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
          include: {
            employee: {
              select: {
                id: true,
                kind: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
    });
    if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");

    const linesWhere = { payrollRunId: run.id };
    if (query?.teacherId) linesWhere.teacherId = query.teacherId;
    if (query?.employeeId) linesWhere.employeeId = query.employeeId;
    if (query?.type) linesWhere.type = query.type;

    const lines = await tx.payrollLine.findMany({
      where: linesWhere,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        employee: {
          select: {
            id: true,
            kind: true,
            firstName: true,
            lastName: true,
            user: { select: { username: true } },
          },
        },
        teacher: { select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } } },
        subject: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true, academicYear: true } },
        realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
      },
    });

    const itemById = new Map((run.items || []).map((item) => [item.id, item]));

    const rows = [
      [
        "rowKind",
        "payrollRunId",
        "periodMonth",
        "runStatus",
        "teacherId",
        "teacherName",
        "teacherUsername",
        "itemTotalMinutes",
        "itemGrossAmount",
        "itemAdjustmentAmount",
        "itemPayableAmount",
        "itemPaidAmount",
        "itemPaymentStatus",
        "lineId",
        "lineType",
        "lessonId",
        "lessonStartAt",
        "lessonEndAt",
        "lessonStatus",
        "subject",
        "classroom",
        "minutes",
        "ratePerHour",
        "amount",
        "description",
        "createdAt",
      ],
    ];

    for (const item of run.items || []) {
      const teacherName =
        (item.employee && `${item.employee.firstName || ""} ${item.employee.lastName || ""}`.trim()) ||
        (item.teacher && `${item.teacher.firstName || ""} ${item.teacher.lastName || ""}`.trim()) ||
        `${item.teacherFirstNameSnapshot || ""} ${item.teacherLastNameSnapshot || ""}`.trim() ||
        item.teacherId ||
        item.employeeId ||
        "";
      const teacherUsername =
        item.employee?.user?.username || item.teacher?.user?.username || item.teacherUsernameSnapshot || "";
      rows.push([
        "ITEM",
        run.id,
        run.periodMonth,
        run.status,
        item.teacherId || item.employeeId || "",
        teacherName,
        teacherUsername,
        item.totalMinutes ?? 0,
        String(item.grossAmount ?? 0),
        String(item.adjustmentAmount ?? 0),
        String(item.payableAmount ?? 0),
        String(item.paidAmount ?? 0),
        item.paymentStatus || "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    for (const line of lines) {
      const item = itemById.get(line.payrollItemId);
      const teacherName =
        (line.employee && `${line.employee.firstName || ""} ${line.employee.lastName || ""}`.trim()) ||
        (line.teacher && `${line.teacher.firstName || ""} ${line.teacher.lastName || ""}`.trim()) ||
        `${item?.teacherFirstNameSnapshot || ""} ${item?.teacherLastNameSnapshot || ""}`.trim() ||
        line.teacherId ||
        line.employeeId ||
        "";
      const teacherUsername =
        line.employee?.user?.username ||
        line.teacher?.user?.username ||
        item?.teacherUsernameSnapshot ||
        "";
      rows.push([
        "LINE",
        run.id,
        run.periodMonth,
        run.status,
        line.teacherId || line.employeeId || "",
        teacherName,
        teacherUsername,
        item?.totalMinutes ?? "",
        item ? String(item.grossAmount ?? 0) : "",
        item ? String(item.adjustmentAmount ?? 0) : "",
        item ? String(item.payableAmount ?? 0) : "",
        item ? String(item.paidAmount ?? 0) : "",
        item?.paymentStatus || "",
        line.id,
        line.type,
        line.realLessonId || "",
        toIsoOrEmpty(line.realLesson?.startAt || line.lessonStartAt),
        toIsoOrEmpty(line.realLesson?.endAt),
        line.realLesson?.status || "",
        line.subject?.name || "",
        line.classroom ? `${line.classroom.name} (${line.classroom.academicYear})` : "",
        line.minutes ?? "",
        line.ratePerHour != null ? String(line.ratePerHour) : "",
        String(line.amount ?? 0),
        line.description || "",
        toIsoOrEmpty(line.createdAt),
      ]);
    }

    const csvBody = "\uFEFF" + buildCsv(rows);
    const fileName = `payroll-${run.periodMonth}-${run.id}.csv`;
    return { fileName, csv: csvBody };
  });
}

async function addPayrollAdjustment({ runId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["DRAFT"]);

    let employee = null;
    let teacher = null;

    if (body.employeeId) {
      employee = await assertEmployeeExists(tx, { employeeId: body.employeeId, organizationId: org.id });
    }
    if (body.teacherId) {
      teacher = await assertTeacherExists(tx, body.teacherId);
    }

    if (!employee && teacher) {
      const ensured = await ensureEmployeeForTeacher(tx, {
        teacherId: teacher.id,
        organizationId: org.id,
      });
      employee = ensured.employee;
      teacher = teacher || ensured.teacher;
    }

    if (!employee) {
      throw new ApiError(400, "PAYROLL_ADJUSTMENT_OWNER_REQUIRED", "teacherId yoki employeeId kerak");
    }

    let teacherIdForLine = teacher?.id || null;
    if (employee.teacher?.id) {
      if (teacherIdForLine && teacherIdForLine !== employee.teacher.id) {
        throw new ApiError(
          409,
          "PAYROLL_ADJUSTMENT_OWNER_MISMATCH",
          "employeeId va teacherId bir-biriga mos emas",
          { employeeId: employee.id, employeeTeacherId: employee.teacher.id, teacherId: teacherIdForLine },
        );
      }
      teacherIdForLine = employee.teacher.id;
    }

    const item = await getOrCreatePayrollItem(tx, {
      organizationId: org.id,
      payrollRunId: run.id,
      teacherId: teacherIdForLine,
      employeeId: employee.id,
    });

    let signedAmount = money(body.amount);
    if (body.type === "PENALTY") signedAmount = signedAmount.neg();

    const line = await tx.payrollLine.create({
      data: {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: employee.id,
        teacherId: teacherIdForLine,
        type: body.type,
        amount: signedAmount,
        description: body.description,
        createdByUserId: actorUserId || null,
      },
    });

    await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_MANUAL_ADJUSTMENT_ADD",
      entityType: "PAYROLL_LINE",
      entityId: line.id,
      payrollRunId: run.id,
      after: {
        employeeId: line.employeeId,
        teacherId: line.teacherId,
        type: line.type,
        amount: String(line.amount),
        description: line.description,
      },
      req,
    });

    return { line };
  });
}

async function deletePayrollAdjustment({ runId, lineId, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["DRAFT"]);

    const line = await tx.payrollLine.findFirst({
      where: { id: lineId, payrollRunId: run.id, organizationId: org.id },
      select: { id: true, type: true, amount: true, description: true, teacherId: true, employeeId: true },
    });
    if (!line) throw new ApiError(404, "PAYROLL_LINE_NOT_FOUND", "Payroll line topilmadi");
    if (!MANUAL_ADJUSTMENT_TYPES.has(line.type)) {
      throw new ApiError(409, "PAYROLL_LINE_DELETE_FORBIDDEN", "Faqat manual adjustment line ni o'chirish mumkin");
    }

    await tx.payrollLine.delete({ where: { id: line.id } });
    await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_MANUAL_ADJUSTMENT_DELETE",
      entityType: "PAYROLL_LINE",
      entityId: line.id,
      payrollRunId: run.id,
      before: {
        employeeId: line.employeeId,
        teacherId: line.teacherId,
        type: line.type,
        amount: String(line.amount),
        description: line.description,
      },
      req,
    });

    return { ok: true };
  });
}

async function approvePayrollRun({ runId, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["DRAFT"]);
    const lineCount = await tx.payrollLine.count({ where: { payrollRunId: run.id } });
    if (!lineCount) throw new ApiError(409, "PAYROLL_EMPTY", "Bo'sh payroll run ni tasdiqlab bo'lmaydi");
    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: actorUserId },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_APPROVE",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status },
      after: { status: updated.status, approvedAt: updated.approvedAt },
      req,
    });
    return { run: updated };
  });
}

async function payPayrollRun({ runId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await lockPayrollRunRow(tx, { runId, organizationId: org.id });
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED"]);
    const paidAt = body.paidAt || new Date();

    const runItems = await tx.payrollItem.findMany({
      where: { payrollRunId: run.id, organizationId: org.id },
      select: {
        id: true,
        employeeId: true,
        teacherId: true,
        payableAmount: true,
        paidAmount: true,
      },
    });

    let itemPaymentsCreated = 0;
    let paidTotal = DECIMAL_ZERO;
    for (const item of runItems) {
      const payable = money(item.payableAmount);
      const normalizedPaid = clampPaidAmountToPayable(item.paidAmount, payable);
      const remaining = money(payable.minus(normalizedPaid));
      const nextPaidAmount = clampPaidAmountToPayable(payable, payable);
      const paymentStatus = getPayrollItemPaymentStatus({
        paidAmount: nextPaidAmount,
        payableAmount: payable,
      });

      await tx.payrollItem.update({
        where: { id: item.id },
        data: {
          paidAmount: nextPaidAmount,
          paymentStatus,
        },
      });

      if (remaining.gt(DECIMAL_ZERO)) {
        const payment = await tx.payrollItemPayment.create({
          data: {
            organizationId: org.id,
            payrollRunId: run.id,
            payrollItemId: item.id,
            employeeId: item.employeeId,
            teacherId: item.teacherId,
            amount: remaining,
            paymentMethod: body.paymentMethod,
            paidAt,
            externalRef: cleanOptional(body.externalRef) || null,
            note: cleanOptional(body.note) || null,
            createdByUserId: actorUserId || null,
          },
        });
        await createPayrollCashEntry(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          payrollItemPaymentId: payment.id,
          amount: remaining.neg(),
          paymentMethod: body.paymentMethod,
          occurredAt: paidAt,
          externalRef: body.externalRef,
          note: body.note,
          createdByUserId: actorUserId || null,
          meta: {
            source: "PAYROLL_RUN_PAY",
            payrollRunId: run.id,
            payrollItemId: item.id,
          },
        });
        itemPaymentsCreated += 1;
        paidTotal = paidTotal.plus(remaining);
      }
    }

    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "PAID",
        paymentMethod: body.paymentMethod,
        paidAt,
        paidByUserId: actorUserId,
        externalRef: cleanOptional(body.externalRef) || null,
        paymentNote: cleanOptional(body.note) || null,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_PAY",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status },
      after: {
        status: updated.status,
        paidAt: updated.paidAt,
        paymentMethod: updated.paymentMethod,
        externalRef: updated.externalRef,
        itemPaymentsCreated,
        paidTotal: String(money(paidTotal)),
      },
      req,
    });
    return { run: updated, itemPaymentsCreated, paidTotal: money(paidTotal) };
  });
}

async function payPayrollItem({ runId, itemId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await lockPayrollRunRow(tx, { runId, organizationId: org.id });
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED"]);
    await lockPayrollItemRow(tx, { itemId, runId: run.id, organizationId: org.id });

    const item = await tx.payrollItem.findFirst({
      where: { id: itemId, payrollRunId: run.id, organizationId: org.id },
      select: {
        id: true,
        employeeId: true,
        teacherId: true,
        payableAmount: true,
        paidAmount: true,
        paymentStatus: true,
      },
    });
    if (!item) throw new ApiError(404, "PAYROLL_ITEM_NOT_FOUND", "Payroll item topilmadi");

    const payable = money(item.payableAmount);
    if (payable.lte(DECIMAL_ZERO)) {
      throw new ApiError(409, "PAYROLL_ITEM_NOT_PAYABLE", "Bu item bo'yicha to'lanadigan summa yo'q");
    }
    const currentPaidAmount = clampPaidAmountToPayable(item.paidAmount, payable);
    const remaining = money(payable.minus(currentPaidAmount));
    if (remaining.lte(DECIMAL_ZERO)) {
      throw new ApiError(409, "PAYROLL_ITEM_ALREADY_PAID", "Bu item allaqachon to'langan");
    }

    const paymentAmount = body.amount === undefined ? remaining : money(body.amount);
    if (paymentAmount.lte(DECIMAL_ZERO)) {
      throw new ApiError(400, "PAYROLL_ITEM_PAY_INVALID_AMOUNT", "To'lov summasi 0 dan katta bo'lishi kerak");
    }
    if (paymentAmount.gt(remaining)) {
      throw new ApiError(
        409,
        "PAYROLL_ITEM_PAY_AMOUNT_EXCEEDED",
        "To'lov summasi qolgan summadan oshmasligi kerak",
        { remaining: String(remaining), attemptedAmount: String(paymentAmount) },
      );
    }

    const paidAt = body.paidAt || new Date();
    const nextPaidAmount = money(currentPaidAmount.plus(paymentAmount));
    const paymentStatus = getPayrollItemPaymentStatus({
      paidAmount: nextPaidAmount,
      payableAmount: payable,
    });

    const updatedItem = await tx.payrollItem.update({
      where: { id: item.id },
      data: {
        paidAmount: nextPaidAmount,
        paymentStatus,
      },
    });

    const payment = await tx.payrollItemPayment.create({
      data: {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: item.employeeId,
        teacherId: item.teacherId,
        amount: paymentAmount,
        paymentMethod: body.paymentMethod,
        paidAt,
        externalRef: cleanOptional(body.externalRef) || null,
        note: cleanOptional(body.note) || null,
        createdByUserId: actorUserId || null,
      },
    });

    await createPayrollCashEntry(tx, {
      organizationId: org.id,
      payrollRunId: run.id,
      payrollItemId: item.id,
      payrollItemPaymentId: payment.id,
      amount: paymentAmount.neg(),
      paymentMethod: body.paymentMethod,
      occurredAt: paidAt,
      externalRef: body.externalRef,
      note: body.note,
      createdByUserId: actorUserId || null,
      meta: {
        source: "PAYROLL_ITEM_PAY",
        payrollRunId: run.id,
        payrollItemId: item.id,
      },
    });

    const runItemsAfterPayment = await tx.payrollItem.findMany({
      where: {
        payrollRunId: run.id,
        organizationId: org.id,
      },
      select: {
        payableAmount: true,
        paidAmount: true,
      },
    });
    const pendingItems = runItemsAfterPayment.filter((row) => (
      getPayrollItemPaymentStatus({
        paidAmount: row.paidAmount,
        payableAmount: row.payableAmount,
      }) !== "PAID"
    )).length;

    let updatedRun = run;
    if (pendingItems === 0) {
      updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "PAID",
          paidAt,
          paidByUserId: actorUserId || null,
          paymentNote: cleanOptional(body.note) || run.paymentNote || null,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId,
        action: "PAYROLL_RUN_PAY_AUTO_COMPLETE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        before: { status: run.status },
        after: { status: updatedRun.status, paidAt: updatedRun.paidAt },
        req,
      });
    }

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_ITEM_PAY",
      entityType: "PAYROLL_ITEM",
      entityId: item.id,
      payrollRunId: run.id,
      before: {
        paidAmount: String(currentPaidAmount),
        paymentStatus: item.paymentStatus,
      },
      after: {
        paymentId: payment.id,
        amount: String(payment.amount),
        paidAmount: String(updatedItem.paidAmount),
        paymentStatus: updatedItem.paymentStatus,
        paymentMethod: payment.paymentMethod,
      },
      req,
    });

    return {
      run: updatedRun,
      item: updatedItem,
      payment,
      remainingAmount: money(payable.minus(nextPaidAmount)),
      autoCompletedRun: pendingItems === 0,
    };
  });
}

async function reversePayrollRun({ runId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await lockPayrollRunRow(tx, { runId, organizationId: org.id });
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED", "PAID"]);
    const reversedAt = new Date();

    // Item/payment update paytda parallel yozuvlarning oldini olish uchun item satrlarini lock qilamiz.
    await tx.$executeRaw`
      SELECT id
      FROM "PayrollItem"
      WHERE "payrollRunId" = ${run.id}
        AND "organizationId" = ${org.id}
      FOR UPDATE
    `;

    const runPayments = await tx.payrollItemPayment.findMany({
      where: { payrollRunId: run.id, organizationId: org.id },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        payrollItemId: true,
        employeeId: true,
        teacherId: true,
        amount: true,
        paymentMethod: true,
        externalRef: true,
      },
    });
    let reversedPaymentCount = 0;
    let reversedTotal = DECIMAL_ZERO;
    for (const payment of runPayments) {
      const paymentAmount = money(payment.amount);
      if (paymentAmount.lte(DECIMAL_ZERO)) continue;

      const reversePayment = await tx.payrollItemPayment.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: payment.payrollItemId,
          employeeId: payment.employeeId,
          teacherId: payment.teacherId,
          amount: paymentAmount.neg(),
          paymentMethod: payment.paymentMethod,
          paidAt: reversedAt,
          externalRef: null,
          note: `REVERSE: ${body.reason}`,
          createdByUserId: actorUserId || null,
        },
      });
      await createPayrollCashEntry(tx, {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: payment.payrollItemId,
        payrollItemPaymentId: reversePayment.id,
        amount: paymentAmount,
        paymentMethod: payment.paymentMethod,
        entryType: "PAYROLL_REVERSAL",
        occurredAt: reversedAt,
        note: body.reason,
        createdByUserId: actorUserId || null,
        meta: {
          source: "PAYROLL_RUN_REVERSE",
          reversedPaymentId: payment.id,
          payrollRunId: run.id,
          payrollItemId: payment.payrollItemId,
        },
      });
      reversedPaymentCount += 1;
      reversedTotal = reversedTotal.plus(paymentAmount);
    }

    const runItems = await tx.payrollItem.findMany({
      where: { payrollRunId: run.id, organizationId: org.id },
      select: { id: true, payableAmount: true },
    });
    for (const item of runItems) {
      await tx.payrollItem.update({
        where: { id: item.id },
        data: {
          paidAmount: DECIMAL_ZERO,
          paymentStatus: getPayrollItemPaymentStatus({
            paidAmount: DECIMAL_ZERO,
            payableAmount: item.payableAmount,
          }),
        },
      });
    }

    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "REVERSED",
        reversedAt,
        reversedByUserId: actorUserId,
        reverseReason: body.reason,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_REVERSE",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status, paidAt: run.paidAt, paymentMethod: run.paymentMethod },
      after: {
        status: updated.status,
        reversedAt: updated.reversedAt,
        reverseReason: updated.reverseReason,
        reversedPaymentCount,
        reversedTotal: String(money(reversedTotal)),
      },
      reason: body.reason,
      req,
    });
    return { run: updated, reversedPaymentCount, reversedTotal: money(reversedTotal) };
  });
}

function normalizeRequestedPeriodMonth(periodMonth) {
  const normalized = cleanOptional(periodMonth);
  if (normalized) {
    monthKeyToUtcRange(normalized);
    return normalized;
  }
  return monthKeyFromDateValue(new Date());
}

async function getPayrollAutomationHealth({ query }) {
  const periodMonth = normalizeRequestedPeriodMonth(query.periodMonth);
  const includeDetails = query.includeDetails !== false;
  const { periodStart, periodEnd } = monthKeyToUtcRange(periodMonth);

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const health = await collectPayrollPeriodDiagnosticsTx(tx, {
      organizationId: org.id,
      periodMonth,
      periodStart,
      periodEnd,
      includeDetails,
    });
    return health;
  });
}

async function getPayrollMonthlyReport({ query }) {
  const periodMonth = normalizeRequestedPeriodMonth(query.periodMonth);
  const includeDetails = query.includeDetails !== false;
  const { periodStart, periodEnd } = monthKeyToUtcRange(periodMonth);

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const health = await collectPayrollPeriodDiagnosticsTx(tx, {
      organizationId: org.id,
      periodMonth,
      periodStart,
      periodEnd,
      includeDetails,
    });

    const run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (!run) {
      return {
        periodMonth,
        run: null,
        summary: {
          grossAmount: money(0),
          adjustmentAmount: money(0),
          payableAmount: money(0),
          paidAmount: money(0),
          remainingAmount: money(0),
          paymentCount: 0,
          paidTeacherCount: 0,
        },
        payoutBreakdown: [],
        paymentMethodBreakdown: [],
        lineTypeBreakdown: [],
        health,
      };
    }

    const [runItems, payments, lines] = await Promise.all([
      tx.payrollItem.findMany({
        where: { payrollRunId: run.id, organizationId: org.id },
        orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
        include: {
          employee: {
            select: {
              id: true,
              kind: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
        },
      }),
      tx.payrollItemPayment.findMany({
        where: { payrollRunId: run.id, organizationId: org.id },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          payrollItemId: true,
        },
      }),
      tx.payrollLine.findMany({
        where: { payrollRunId: run.id, organizationId: org.id },
        select: { id: true, type: true, amount: true },
      }),
    ]);

    const teacherMetricByTeacherId = new Map(
      (health.teacherMetrics || []).map((row) => [row.teacherId, row]),
    );

    const payoutBreakdown = runItems.map((item) => {
      const teacherName =
        (item.employee && `${item.employee.firstName || ""} ${item.employee.lastName || ""}`.trim()) ||
        (item.teacher && `${item.teacher.firstName || ""} ${item.teacher.lastName || ""}`.trim()) ||
        `${item.teacherFirstNameSnapshot || ""} ${item.teacherLastNameSnapshot || ""}`.trim() ||
        item.teacherId ||
        item.employeeId ||
        "-";
      const username =
        item.employee?.user?.username ||
        item.teacher?.user?.username ||
        item.teacherUsernameSnapshot ||
        null;
      const teacherMetric = item.teacherId ? teacherMetricByTeacherId.get(item.teacherId) : null;
      const paidAmount = money(item.paidAmount);
      const payableAmount = money(item.payableAmount);
      return {
        payrollItemId: item.id,
        teacherId: item.teacherId || null,
        employeeId: item.employeeId || null,
        ownerName: username ? `${teacherName} (@${username})` : teacherName,
        paymentStatus: item.paymentStatus,
        totalMinutes: Number(item.totalMinutes || 0),
        totalHours: decimalToNumber(item.totalHours),
        grossAmount: item.grossAmount,
        adjustmentAmount: item.adjustmentAmount,
        payableAmount,
        paidAmount,
        remainingAmount: money(payableAmount.minus(paidAmount)),
        plannedMonthlyMinutes: teacherMetric?.plannedMonthlyMinutes || 0,
        actualMonthlyMinutes: teacherMetric?.actualMonthlyMinutes || 0,
        monthlyDeltaMinutes: teacherMetric?.monthlyDeltaMinutes || 0,
      };
    });

    const methodTotals = new Map();
    for (const payment of payments) {
      const prev = methodTotals.get(payment.paymentMethod) || DECIMAL_ZERO;
      methodTotals.set(payment.paymentMethod, money(prev.plus(payment.amount)));
    }
    const paymentMethodBreakdown = [...methodTotals.entries()]
      .map(([paymentMethod, amount]) => ({ paymentMethod, amount }))
      .sort((a, b) => decimalToNumber(b.amount) - decimalToNumber(a.amount));

    const lineTypeTotals = new Map();
    for (const line of lines) {
      const prev = lineTypeTotals.get(line.type) || DECIMAL_ZERO;
      lineTypeTotals.set(line.type, money(prev.plus(line.amount)));
    }
    const lineTypeBreakdown = [...lineTypeTotals.entries()]
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => decimalToNumber(b.amount) - decimalToNumber(a.amount));

    const totalPaidAmount = payments.reduce((sum, row) => sum.plus(decimal(row.amount)), DECIMAL_ZERO);
    const paidTeacherCount = runItems.filter((item) => item.paymentStatus === "PAID").length;
    const remainingAmount = money(decimal(run.payableAmount).minus(totalPaidAmount));

    return {
      periodMonth,
      run,
      summary: {
        grossAmount: run.grossAmount,
        adjustmentAmount: run.adjustmentAmount,
        payableAmount: run.payableAmount,
        paidAmount: money(totalPaidAmount),
        remainingAmount,
        paymentCount: payments.length,
        paidTeacherCount,
      },
      payoutBreakdown,
      paymentMethodBreakdown,
      lineTypeBreakdown,
      health,
    };
  });
}

async function runPayrollAutomation({ body, actorUserId, req }) {
  const periodMonth = normalizeRequestedPeriodMonth(body.periodMonth);
  const dryRun = body.dryRun === true;
  const autoApprove = body.autoApprove !== false;
  const autoPay = body.autoPay === true;
  const force = body.force === true;

  const healthBefore = await getPayrollAutomationHealth({
    query: {
      periodMonth,
      includeDetails: true,
    },
  });

  if (dryRun) {
    return {
      periodMonth,
      dryRun: true,
      steps: [],
      healthBefore,
      healthAfter: healthBefore,
      run: healthBefore.currentRun || null,
    };
  }

  if (!force && healthBefore.summary.blockerCount > 0) {
    throw new ApiError(
      409,
      "PAYROLL_AUTOMATION_BLOCKED",
      "Payroll avtomatlashtirishdan oldin blocker xatolarni bartaraf qiling",
      { health: healthBefore },
    );
  }

  const steps = [];
  let run = healthBefore.currentRun || null;

  if (body.generate !== false) {
    if (run?.status && run.status !== "DRAFT") {
      steps.push({
        step: "GENERATE",
        status: "SKIPPED",
        runId: run.id,
        reason: `run_status=${run.status}`,
      });
    } else {
      const generation = await generatePayrollRun({
        body: { periodMonth },
        actorUserId,
        req,
      });
      run = generation.run || run;
      steps.push({
        step: "GENERATE",
        status: "DONE",
        runId: run?.id || null,
        lessonCount: generation?.generation?.lessonsProcessed || 0,
      });
    }
  } else {
    steps.push({
      step: "GENERATE",
      status: "SKIPPED",
      reason: "generate=false",
      runId: run?.id || null,
    });
  }

  if (!run?.id) {
    run = await prisma.$transaction(async (tx) => {
      const org = await ensureMainOrganization(tx);
      return getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    });
  }

  if (autoApprove) {
    if (!run?.id) {
      throw new ApiError(409, "PAYROLL_RUN_NOT_FOUND", "Approve qilish uchun payroll run topilmadi");
    }
    if (run.status === "DRAFT") {
      const approved = await approvePayrollRun({
        runId: run.id,
        actorUserId,
        req,
      });
      run = approved.run;
      steps.push({
        step: "APPROVE",
        status: "DONE",
        runId: run.id,
      });
    } else {
      steps.push({
        step: "APPROVE",
        status: "SKIPPED",
        runId: run.id,
        reason: `run_status=${run.status}`,
      });
    }
  } else {
    steps.push({
      step: "APPROVE",
      status: "SKIPPED",
      runId: run?.id || null,
      reason: "autoApprove=false",
    });
  }

  if (autoPay) {
    if (!run?.id) {
      throw new ApiError(409, "PAYROLL_RUN_NOT_FOUND", "Pay qilish uchun payroll run topilmadi");
    }
    if (run.status === "APPROVED") {
      const paid = await payPayrollRun({
        runId: run.id,
        body: {
          paymentMethod: body.paymentMethod || "BANK",
          ...(body.paidAt ? { paidAt: body.paidAt } : {}),
          ...(body.externalRef ? { externalRef: body.externalRef } : {}),
          ...(body.note ? { note: body.note } : {}),
        },
        actorUserId,
        req,
      });
      run = paid.run;
      steps.push({
        step: "PAY",
        status: "DONE",
        runId: run.id,
        paidTotal: paid.paidTotal,
        itemPaymentsCreated: paid.itemPaymentsCreated,
      });
    } else {
      steps.push({
        step: "PAY",
        status: "SKIPPED",
        runId: run.id,
        reason: `run_status=${run.status}`,
      });
    }
  } else {
    steps.push({
      step: "PAY",
      status: "SKIPPED",
      runId: run?.id || null,
      reason: "autoPay=false",
    });
  }

  const healthAfter = await getPayrollAutomationHealth({
    query: {
      periodMonth,
      includeDetails: false,
    },
  });

  let runSnapshot = null;
  if (run?.id) {
    runSnapshot = await prisma.$transaction(async (tx) => {
      const org = await ensureMainOrganization(tx);
      return tx.payrollRun.findFirst({
        where: { id: run.id, organizationId: org.id },
        include: {
          items: {
            orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  user: { select: { username: true } },
                },
              },
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  user: { select: { username: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  return {
    periodMonth,
    dryRun: false,
    steps,
    healthBefore,
    healthAfter,
    run: runSnapshot,
  };
}

async function findTeacherByUserId(tx, userId) {
  const teacher = await tx.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  return teacher;
}

async function getTeacherPayslipsByUserId({ userId, query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const teacher = await findTeacherByUserId(tx, userId);
    const where = { teacherId: teacher.id };
    if (query.status || query.periodMonth) {
      where.payrollRun = { is: {} };
      if (query.status) where.payrollRun.is.status = query.status;
      if (query.periodMonth) where.payrollRun.is.periodMonth = query.periodMonth;
    }

    const [items, total] = await Promise.all([
      tx.payrollItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ payrollRun: { periodStart: "desc" } }, { createdAt: "desc" }],
        include: {
          payrollRun: {
            select: {
              id: true,
              periodMonth: true,
              periodStart: true,
              periodEnd: true,
              status: true,
              approvedAt: true,
              paidAt: true,
              paymentMethod: true,
              externalRef: true,
            },
          },
        },
      }),
      tx.payrollItem.count({ where }),
    ]);

    return {
      teacher,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      payslips: items,
    };
  });
}

async function getTeacherPayslipDetailByUserId({ userId, runId, query }) {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 100), 200);
  const skip = (page - 1) * limit;

  return prisma.$transaction(async (tx) => {
    const teacher = await findTeacherByUserId(tx, userId);
    const item = await tx.payrollItem.findFirst({
      where: { payrollRunId: runId, teacherId: teacher.id },
      include: {
        payrollRun: {
          select: {
            id: true,
            periodMonth: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            approvedAt: true,
            paidAt: true,
            paymentMethod: true,
            externalRef: true,
            paymentNote: true,
            reverseReason: true,
          },
        },
      },
    });
    if (!item) throw new ApiError(404, "PAYSLIP_NOT_FOUND", "Payslip topilmadi");

    const linesWhere = { payrollRunId: runId, teacherId: teacher.id };
    if (query.type) linesWhere.type = query.type;

    const [items, total] = await Promise.all([
      tx.payrollLine.findMany({
        where: linesWhere,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
        },
      }),
      tx.payrollLine.count({ where: linesWhere }),
    ]);

    return {
      teacher,
      payslip: item,
      lines: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        items,
      },
    };
  });
}

module.exports = {
  listRealLessons,
  createRealLesson,
  updateRealLessonStatus,
  bulkUpdateRealLessonStatus,
  listPayrollEmployees,
  updatePayrollEmployeeConfig,
  listTeacherRates,
  createTeacherRate,
  updateTeacherRate,
  deleteTeacherRate,
  listSubjectDefaultRates,
  createSubjectDefaultRate,
  updateSubjectDefaultRate,
  deleteSubjectDefaultRate,
  listAdvancePayments,
  createAdvancePayment,
  deleteAdvancePayment,
  refreshDraftPayrollForLesson,
  generatePayrollRun,
  listPayrollRuns,
  getPayrollRunDetail,
  exportPayrollRunCsv,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  approvePayrollRun,
  payPayrollRun,
  payPayrollItem,
  reversePayrollRun,
  getPayrollAutomationHealth,
  runPayrollAutomation,
  getPayrollMonthlyReport,
  getTeacherPayslipsByUserId,
  getTeacherPayslipDetailByUserId,
  __private: {
    isEmployeeLessonPayrollEligible,
    buildItemSummaryFromLines,
  },
};
