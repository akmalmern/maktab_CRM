const prisma = require("../../prisma");
const { Prisma } = require("@prisma/client");
const { ApiError } = require("../../utils/apiError");
const { localDayStartUtc } = require("../../utils/tashkentTime");

const MAIN_ORG_KEY = "MAIN";
const MAIN_ORG_NAME = "Asosiy tashkilot";
const ACTIVE_PAYROLL_STATUSES = ["DRAFT", "APPROVED", "PAID"];
const DECIMAL_ZERO = new Prisma.Decimal(0);

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

function rateMatchesAt(rate, at) {
  const fromOk = new Date(rate.effectiveFrom).getTime() <= new Date(at).getTime();
  const toOk = !rate.effectiveTo || new Date(rate.effectiveTo).getTime() > new Date(at).getTime();
  return fromOk && toOk;
}

async function loadRatesForPeriod(tx, { organizationId, lessons, periodStart, periodEnd }) {
  const teacherIds = [...new Set(lessons.map((l) => l.teacherId))];
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

async function getOrCreatePayrollItem(tx, { organizationId, payrollRunId, teacherId }) {
  let item = await tx.payrollItem.findUnique({
    where: { payrollRunId_teacherId: { payrollRunId, teacherId } },
    select: { id: true, teacherId: true },
  });
  if (item) return item;

  const teacher = await tx.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: { select: { username: true } },
    },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");

  item = await tx.payrollItem.create({
    data: {
      organizationId,
      payrollRunId,
      teacherId,
      teacherFirstNameSnapshot: teacher.firstName,
      teacherLastNameSnapshot: teacher.lastName,
      teacherUsernameSnapshot: teacher.user?.username || null,
    },
    select: { id: true, teacherId: true },
  });
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

  for (const line of lines) {
    lineCount += 1;
    const amount = decimal(line.amount);
    if (line.type === "LESSON") {
      lessonLineCount += 1;
      totalMinutes += Number(line.minutes || 0);
      grossAmount = grossAmount.plus(amount);
    } else if (line.type === "BONUS") {
      bonusAmount = bonusAmount.plus(amount);
    } else if (line.type === "PENALTY") {
      penaltyAmountSigned = penaltyAmountSigned.plus(amount);
    } else if (line.type === "MANUAL") {
      manualAmount = manualAmount.plus(amount);
    }
  }

  const penaltyAmount = penaltyAmountSigned.abs();
  const adjustmentAmount = money(bonusAmount.plus(manualAmount).plus(penaltyAmountSigned));
  const payableAmount = money(grossAmount.plus(adjustmentAmount));

  return {
    totalMinutes,
    totalHours: money(decimal(totalMinutes).div(60)),
    grossAmount: money(grossAmount),
    bonusAmount: money(bonusAmount),
    penaltyAmount: money(penaltyAmount),
    manualAmount: money(manualAmount),
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
    select: { id: true, teacherId: true },
  });
  const lines = await tx.payrollLine.findMany({
    where: { payrollRunId },
    include: {
      teacher: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
    },
  });

  const itemByTeacher = new Map(items.map((i) => [i.teacherId, i]));
  const linesByTeacher = new Map();
  for (const line of lines) {
    if (!linesByTeacher.has(line.teacherId)) linesByTeacher.set(line.teacherId, []);
    linesByTeacher.get(line.teacherId).push(line);
  }

  let runGross = DECIMAL_ZERO;
  let runAdjustments = DECIMAL_ZERO;
  let runPayable = DECIMAL_ZERO;
  let teacherCount = 0;
  let sourceLessonsCount = 0;

  for (const [teacherId, teacherLines] of linesByTeacher.entries()) {
    teacherCount += 1;
    const item = itemByTeacher.get(teacherId);
    if (!item) throw new ApiError(500, "PAYROLL_ITEM_MISSING", "Payroll item topilmadi (data integrity)");
    const summary = buildItemSummaryFromLines(teacherLines);
    const teacherSnap = teacherLines[0]?.teacher;
    sourceLessonsCount += summary.lessonLineCount;
    runGross = runGross.plus(summary.grossAmount);
    runAdjustments = runAdjustments.plus(summary.adjustmentAmount);
    runPayable = runPayable.plus(summary.payableAmount);

    await tx.payrollItem.update({
      where: { id: item.id },
      data: {
        totalMinutes: summary.totalMinutes,
        totalHours: summary.totalHours,
        grossAmount: summary.grossAmount,
        bonusAmount: summary.bonusAmount,
        penaltyAmount: summary.penaltyAmount,
        manualAmount: summary.manualAmount,
        adjustmentAmount: summary.adjustmentAmount,
        payableAmount: summary.payableAmount,
        lessonLineCount: summary.lessonLineCount,
        lineCount: summary.lineCount,
        teacherFirstNameSnapshot: teacherSnap?.firstName || null,
        teacherLastNameSnapshot: teacherSnap?.lastName || null,
        teacherUsernameSnapshot: teacherSnap?.user?.username || null,
        summarySnapshot: {
          totalMinutes: summary.totalMinutes,
          totalHours: String(summary.totalHours),
          grossAmount: String(summary.grossAmount),
          bonusAmount: String(summary.bonusAmount),
          penaltyAmount: String(summary.penaltyAmount),
          manualAmount: String(summary.manualAmount),
          adjustmentAmount: String(summary.adjustmentAmount),
          payableAmount: String(summary.payableAmount),
          lessonLineCount: summary.lessonLineCount,
          lineCount: summary.lineCount,
        },
      },
    });
  }

  const teacherIdsWithLines = [...linesByTeacher.keys()];
  await tx.payrollItem.deleteMany({
    where: {
      payrollRunId,
      ...(teacherIdsWithLines.length ? { teacherId: { notIn: teacherIdsWithLines } } : {}),
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

async function generatePayrollRun({ body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const { periodMonth, periodStart, periodEnd } = monthKeyToUtcRange(body.periodMonth);

    let run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    if (!run) {
      run = await tx.payrollRun.create({
        data: {
          organizationId: org.id,
          periodMonth,
          periodStart,
          periodEnd,
          timezone: "Asia/Tashkent",
          status: "DRAFT",
          createdByUserId: actorUserId,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId,
        action: "PAYROLL_RUN_CREATE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        after: { periodMonth, periodStart, periodEnd, status: "DRAFT" },
        req,
      });
    }

    await tx.payrollLine.deleteMany({ where: { payrollRunId: run.id, type: "LESSON" } });

    const lessons = await tx.realLesson.findMany({
      where: {
        organizationId: org.id,
        status: "DONE",
        startAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        teacherId: true,
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

    const missingRateLessons = [];
    for (const lesson of lessons) {
      const resolved = resolveRateForLesson({
        lesson,
        teacherRateMap: teacherMap,
        subjectDefaultRateMap: subjectMap,
      });
      if (!resolved) {
        missingRateLessons.push({
          realLessonId: lesson.id,
          teacherId: lesson.teacherId,
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
      select: { id: true, teacherId: true },
    });
    const itemCache = new Map(existingItems.map((r) => [r.teacherId, r]));

    for (const lesson of lessons) {
      let item = itemCache.get(lesson.teacherId);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          teacherId: lesson.teacherId,
        });
        itemCache.set(lesson.teacherId, item);
      }
      const resolved = resolveRateForLesson({
        lesson,
        teacherRateMap: teacherMap,
        subjectDefaultRateMap: subjectMap,
      });
      const amount = calcLessonAmount(resolved.ratePerHour, lesson.durationMinutes);
      await tx.payrollLine.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          teacherId: lesson.teacherId,
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
          meta: { resolution: { rateSource: resolved.rateSource } },
        },
      });
    }

    await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });

    const beforeGeneratedAt = run.generatedAt;
    const now = new Date();
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        generatedAt: now,
        generationSummary: {
          periodMonth,
          lessonCount: lessons.length,
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
      after: { status: "DRAFT", lessonCount: lessons.length },
      req,
    });

    const freshRun = await tx.payrollRun.findUnique({
      where: { id: run.id },
      include: {
        items: {
          orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
          include: {
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
      generation: { lessonsProcessed: lessons.length },
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
    if (query.type) linesWhere.type = query.type;

    const [items, total] = await Promise.all([
      tx.payrollLine.findMany({
        where: linesWhere,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
        },
      }),
      tx.payrollLine.count({ where: linesWhere }),
    ]);

    return {
      run,
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
    if (query?.type) linesWhere.type = query.type;

    const lines = await tx.payrollLine.findMany({
      where: linesWhere,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } } },
        subject: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true, academicYear: true } },
        realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
      },
    });

    const itemByTeacherId = new Map((run.items || []).map((item) => [item.teacherId, item]));

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
        (item.teacher && `${item.teacher.firstName || ""} ${item.teacher.lastName || ""}`.trim()) ||
        `${item.teacherFirstNameSnapshot || ""} ${item.teacherLastNameSnapshot || ""}`.trim() ||
        item.teacherId;
      const teacherUsername =
        item.teacher?.user?.username || item.teacherUsernameSnapshot || "";
      rows.push([
        "ITEM",
        run.id,
        run.periodMonth,
        run.status,
        item.teacherId,
        teacherName,
        teacherUsername,
        item.totalMinutes ?? 0,
        String(item.grossAmount ?? 0),
        String(item.adjustmentAmount ?? 0),
        String(item.payableAmount ?? 0),
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
      const teacherName =
        (line.teacher && `${line.teacher.firstName || ""} ${line.teacher.lastName || ""}`.trim()) ||
        itemByTeacherId.get(line.teacherId)?.teacherFirstNameSnapshot ||
        line.teacherId;
      const teacherUsername =
        line.teacher?.user?.username || itemByTeacherId.get(line.teacherId)?.teacherUsernameSnapshot || "";
      const item = itemByTeacherId.get(line.teacherId);
      rows.push([
        "LINE",
        run.id,
        run.periodMonth,
        run.status,
        line.teacherId,
        teacherName,
        teacherUsername,
        item?.totalMinutes ?? "",
        item ? String(item.grossAmount ?? 0) : "",
        item ? String(item.adjustmentAmount ?? 0) : "",
        item ? String(item.payableAmount ?? 0) : "",
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

    await assertTeacherExists(tx, body.teacherId);
    const item = await getOrCreatePayrollItem(tx, {
      organizationId: org.id,
      payrollRunId: run.id,
      teacherId: body.teacherId,
    });

    let signedAmount = money(body.amount);
    if (body.type === "PENALTY") signedAmount = signedAmount.neg();

    const line = await tx.payrollLine.create({
      data: {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        teacherId: body.teacherId,
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
      select: { id: true, type: true, amount: true, description: true, teacherId: true },
    });
    if (!line) throw new ApiError(404, "PAYROLL_LINE_NOT_FOUND", "Payroll line topilmadi");
    if (line.type === "LESSON") {
      throw new ApiError(409, "PAYROLL_LINE_DELETE_FORBIDDEN", "LESSON line ni o'chirib bo'lmaydi");
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
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED"]);
    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "PAID",
        paymentMethod: body.paymentMethod,
        paidAt: body.paidAt || new Date(),
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
      },
      req,
    });
    return { run: updated };
  });
}

async function reversePayrollRun({ runId, body, actorUserId, req }) {
  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED", "PAID"]);
    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
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
      after: { status: updated.status, reversedAt: updated.reversedAt, reverseReason: updated.reverseReason },
      reason: body.reason,
      req,
    });
    return { run: updated };
  });
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

    const [items, total] = await Promise.all([
      tx.payrollLine.findMany({
        where: { payrollRunId: runId, teacherId: teacher.id },
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
        },
      }),
      tx.payrollLine.count({ where: { payrollRunId: runId, teacherId: teacher.id } }),
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
  listTeacherRates,
  createTeacherRate,
  updateTeacherRate,
  deleteTeacherRate,
  listSubjectDefaultRates,
  createSubjectDefaultRate,
  updateSubjectDefaultRate,
  deleteSubjectDefaultRate,
  generatePayrollRun,
  listPayrollRuns,
  getPayrollRunDetail,
  exportPayrollRunCsv,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  approvePayrollRun,
  payPayrollRun,
  reversePayrollRun,
  getTeacherPayslipsByUserId,
  getTeacherPayslipDetailByUserId,
};
