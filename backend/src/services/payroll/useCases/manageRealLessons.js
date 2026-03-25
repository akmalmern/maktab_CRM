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

async function executeListRealLessons({ deps, query }) {
  const { prisma, ensureMainOrganization, monthKeyToUtcRange } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 200 });

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

async function executeCreateRealLesson({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    assertTeacherExists,
    assertSubjectExists,
    assertClassroomExists,
    assertDarsJadvaliExists,
    computeDurationMinutes,
    cleanOptional,
    createAuditLog,
    refreshDraftPayrollForLessonsSafe,
  } = deps;

  const txResult = await prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await Promise.all([
      assertTeacherExists(tx, body.teacherId),
      assertSubjectExists(tx, body.subjectId),
      assertClassroomExists(tx, body.classroomId),
      body.replacedByTeacherId ? assertTeacherExists(tx, body.replacedByTeacherId) : Promise.resolve(null),
    ]);
    if (body.status === "REPLACED" && body.replacedByTeacherId === body.teacherId) {
      throw new ApiError(
        400,
        "REAL_LESSON_SELF_REPLACEMENT_INVALID",
        "Asosiy va o'rinbosar o'qituvchi bir xil bo'lishi mumkin emas",
      );
    }
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
    const duplicateByDimensions = await tx.realLesson.findFirst({
      where: {
        organizationId: org.id,
        teacherId: body.teacherId,
        subjectId: body.subjectId,
        classroomId: body.classroomId,
        startAt: body.startAt,
      },
      select: { id: true },
    });
    if (duplicateByDimensions) {
      throw new ApiError(
        409,
        "REAL_LESSON_DUPLICATE",
        "Bu o'qituvchi/fan/sinf uchun shu vaqtga RealLesson allaqachon mavjud",
        { realLessonId: duplicateByDimensions.id },
      );
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
  const payrollAutoRun = await refreshDraftPayrollForLessonsSafe({
    lessonIds: [txResult.lesson?.id],
    actorUserId,
    req,
  });
  return { ...txResult, payrollAutoRun };
}

async function executeUpdateRealLessonStatus({ deps, lessonId, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    assertTeacherExists,
    cleanOptional,
    createAuditLog,
    refreshDraftPayrollForLessonsSafe,
  } = deps;

  const txResult = await prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.realLesson.findFirst({
      where: { id: lessonId, organizationId: org.id },
      select: {
        id: true,
        teacherId: true,
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
    if (
      body.status === "REPLACED" &&
      body.replacedByTeacherId &&
      body.replacedByTeacherId === before.teacherId
    ) {
      throw new ApiError(
        400,
        "REAL_LESSON_SELF_REPLACEMENT_INVALID",
        "Asosiy va o'rinbosar o'qituvchi bir xil bo'lishi mumkin emas",
      );
    }

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
  const payrollAutoRun = await refreshDraftPayrollForLessonsSafe({
    lessonIds: [txResult.lesson?.id],
    actorUserId,
    req,
  });
  return { ...txResult, payrollAutoRun };
}

async function executeBulkUpdateRealLessonStatus({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    assertTeacherExists,
    cleanOptional,
    createAuditLog,
    refreshDraftPayrollForLessonsSafe,
  } = deps;

  const txResult = await prisma.$transaction(async (tx) => {
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
        teacherId: true,
        status: true,
        note: true,
        replacedByTeacherId: true,
        payrollLines: { select: { id: true }, take: 1 },
      },
    });
    const byId = new Map(lessons.map((row) => [row.id, row]));

    const updated = [];
    const skipped = [];

    for (const currentLessonId of lessonIds) {
      const before = byId.get(currentLessonId);
      if (!before) {
        skipped.push({ lessonId: currentLessonId, code: "REAL_LESSON_NOT_FOUND", reason: "Real lesson topilmadi" });
        continue;
      }
      if (before.payrollLines?.length) {
        skipped.push({
          lessonId: currentLessonId,
          code: "REAL_LESSON_LOCKED_BY_PAYROLL",
          reason: "Dars payrollga tushgan. Statusni o'zgartirib bo'lmaydi",
        });
        continue;
      }
      if (
        body.status === "REPLACED" &&
        body.replacedByTeacherId &&
        body.replacedByTeacherId === before.teacherId
      ) {
        skipped.push({
          lessonId: currentLessonId,
          code: "REAL_LESSON_SELF_REPLACEMENT_INVALID",
          reason: "Asosiy va o'rinbosar o'qituvchi bir xil bo'lishi mumkin emas",
        });
        continue;
      }

      const lesson = await tx.realLesson.update({
        where: { id: currentLessonId },
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
  const payrollAutoRun = await refreshDraftPayrollForLessonsSafe({
    lessonIds: txResult.updatedLessonIds,
    actorUserId,
    req,
  });
  return { ...txResult, payrollAutoRun };
}

module.exports = {
  executeListRealLessons,
  executeCreateRealLesson,
  executeUpdateRealLessonStatus,
  executeBulkUpdateRealLessonStatus,
};
