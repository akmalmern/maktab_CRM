function parsePagination(query, { defaultLimit, maxLimit }) {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : defaultLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function executeListTeacherRates({ deps, query }) {
  const { prisma, ensureMainOrganization } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

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

async function executeCreateTeacherRate({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ensureMainOrganization,
    assertTeacherExists,
    assertSubjectExists,
    money,
    cleanOptional,
    assertNoTeacherRateOverlap,
    createAuditLog,
  } = deps;

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

async function executeUpdateTeacherRate({ deps, rateId, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    money,
    cleanOptional,
    assertTeacherExists,
    assertSubjectExists,
    assertNoTeacherRateOverlap,
    createAuditLog,
  } = deps;

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

async function executeDeleteTeacherRate({ deps, rateId, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    createAuditLog,
  } = deps;

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

async function executeListSubjectDefaultRates({ deps, query }) {
  const { prisma, ensureMainOrganization } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

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

async function executeCreateSubjectDefaultRate({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ensureMainOrganization,
    assertSubjectExists,
    money,
    cleanOptional,
    assertNoSubjectDefaultRateOverlap,
    createAuditLog,
  } = deps;

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

async function executeUpdateSubjectDefaultRate({ deps, rateId, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    money,
    cleanOptional,
    assertSubjectExists,
    assertNoSubjectDefaultRateOverlap,
    createAuditLog,
  } = deps;

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

async function executeDeleteSubjectDefaultRate({ deps, rateId, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    createAuditLog,
  } = deps;

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

module.exports = {
  executeListTeacherRates,
  executeCreateTeacherRate,
  executeUpdateTeacherRate,
  executeDeleteTeacherRate,
  executeListSubjectDefaultRates,
  executeCreateSubjectDefaultRate,
  executeUpdateSubjectDefaultRate,
  executeDeleteSubjectDefaultRate,
};
