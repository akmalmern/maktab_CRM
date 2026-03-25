function buildAttendanceSessionAuditAfter({
  darsId,
  sana,
  studentCount,
  createdDavomatCount,
  updatedDavomatCount,
  createdBahoCount,
  updatedBahoCount,
  deletedBahoCount,
  realLessonId,
  payrollLockedLesson = false,
}) {
  return {
    darsId,
    sana,
    studentCount,
    createdDavomatCount,
    updatedDavomatCount,
    createdBahoCount,
    updatedBahoCount,
    deletedBahoCount,
    realLessonId,
    ...(payrollLockedLesson ? { payrollLockedLesson: true } : {}),
  };
}

async function executeSaveTeacherAttendanceSession({ deps, userId, darsId, body }) {
  const {
    prisma,
    ApiError,
    parseSanaOrToday,
    localTodayIsoDate,
    getTeacherAttendanceScopeByUserId,
    ensureDateMatchesLessonDay,
    createDarsDateTimeUTC,
    buildRealLessonTiming,
    ensureMainOrganization,
    refreshDraftPayrollForLesson,
  } = deps;

  const { sana: sanaStr, davomatlar } = body;
  const { sana } = parseSanaOrToday(sanaStr);

  const seenStudentIds = new Set();
  for (const row of davomatlar || []) {
    if (!row?.studentId) continue;
    if (seenStudentIds.has(row.studentId)) {
      throw new ApiError(
        400,
        "DAVOMAT_DUPLICATE_STUDENT",
        "Bir student uchun bir darsda faqat bitta davomat yozuvi yuborilishi kerak",
      );
    }
    seenStudentIds.add(row.studentId);
  }

  if (sanaStr > localTodayIsoDate()) {
    throw new ApiError(
      400,
      "KELAJAK_SANA_MUMKIN_EMAS",
      "Kelajak sana uchun davomat yoki baho saqlab bo'lmaydi",
    );
  }

  const teacher = await getTeacherAttendanceScopeByUserId(userId);
  const dars = await prisma.darsJadvali.findFirst({
    where: { id: darsId, oqituvchiId: teacher.id },
    select: {
      id: true,
      sinfId: true,
      fanId: true,
      oqituvchiId: true,
      haftaKuni: true,
      vaqtOraliq: { select: { boshlanishVaqti: true, tugashVaqti: true } },
    },
  });

  if (!dars) {
    throw new ApiError(
      404,
      "DARS_TOPILMADI",
      "Bu dars sizga tegishli emas yoki topilmadi",
    );
  }

  ensureDateMatchesLessonDay(sana, dars.haftaKuni);

  const darsBoshlanishSana = createDarsDateTimeUTC(sana, dars.vaqtOraliq?.boshlanishVaqti);
  if (darsBoshlanishSana) {
    const tahrirMuddatOxiri = new Date(darsBoshlanishSana.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > tahrirMuddatOxiri) {
      throw new ApiError(
        403,
        "DAVOMAT_YOPILGAN",
        "Bu dars davomatini tahrirlash muddati tugagan (24 soatdan oshgan)",
      );
    }
  }

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { classroomId: dars.sinfId, isActive: true },
    select: { studentId: true },
  });
  const activeStudentIds = new Set(activeEnrollments.map((item) => item.studentId));
  const invalidStudent = davomatlar.find((item) => !activeStudentIds.has(item.studentId));
  if (invalidStudent) {
    throw new ApiError(
      400,
      "SINF_STUDENT_NOMOS",
      "Yuborilgan studentlardan biri bu sinfga tegishli emas",
    );
  }

  const studentIds = [...new Set(davomatlar.map((item) => item.studentId))];
  const sanaIso = sana.toISOString().slice(0, 10);

  const txResult = await prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const [existingDavomatlar, existingBaholar] = await Promise.all([
      tx.davomat.findMany({
        where: {
          darsJadvaliId: darsId,
          sana,
          studentId: { in: studentIds },
        },
        select: { id: true, studentId: true },
      }),
      tx.baho.findMany({
        where: {
          darsJadvaliId: darsId,
          sana,
          studentId: { in: studentIds },
        },
        select: { id: true, studentId: true, turi: true },
      }),
    ]);

    const existingDavomatByStudentId = new Map(existingDavomatlar.map((row) => [row.studentId, row]));
    const existingBahoByKey = new Map(existingBaholar.map((row) => [`${row.studentId}__${row.turi}`, row]));

    const davomatCreates = [];
    const davomatUpdateOps = [];
    const bahoCreates = [];
    const bahoUpdateOps = [];
    const bahoDeleteIds = [];

    for (const item of davomatlar) {
      const existingDavomat = existingDavomatByStudentId.get(item.studentId);
      if (existingDavomat) {
        davomatUpdateOps.push(
          tx.davomat.update({
            where: { id: existingDavomat.id },
            data: {
              holat: item.holat,
              belgilaganTeacherId: teacher.id,
            },
          }),
        );
      } else {
        davomatCreates.push({
          darsJadvaliId: darsId,
          studentId: item.studentId,
          belgilaganTeacherId: teacher.id,
          sana,
          holat: item.holat,
        });
      }

      if (item.bahoBall === null && item.bahoTuri !== undefined) {
        const key = `${item.studentId}__${item.bahoTuri}`;
        const existingBaho = existingBahoByKey.get(key);
        if (existingBaho) bahoDeleteIds.push(existingBaho.id);
        continue;
      }

      if (
        typeof item.bahoBall === "number" &&
        typeof item.bahoMaxBall === "number" &&
        item.bahoTuri !== undefined
      ) {
        const key = `${item.studentId}__${item.bahoTuri}`;
        const existingBaho = existingBahoByKey.get(key);

        if (existingBaho) {
          bahoUpdateOps.push(
            tx.baho.update({
              where: { id: existingBaho.id },
              data: {
                teacherId: teacher.id,
                ball: item.bahoBall,
                maxBall: item.bahoMaxBall,
              },
            }),
          );
        } else {
          bahoCreates.push({
            darsJadvaliId: darsId,
            studentId: item.studentId,
            teacherId: teacher.id,
            sana,
            turi: item.bahoTuri,
            ball: item.bahoBall,
            maxBall: item.bahoMaxBall,
          });
        }
      }
    }

    if (davomatCreates.length) await tx.davomat.createMany({ data: davomatCreates });
    if (bahoCreates.length) await tx.baho.createMany({ data: bahoCreates });
    if (bahoDeleteIds.length) {
      await tx.baho.deleteMany({ where: { id: { in: bahoDeleteIds } } });
    }
    if (davomatUpdateOps.length) await Promise.all(davomatUpdateOps);
    if (bahoUpdateOps.length) await Promise.all(bahoUpdateOps);

    const lessonTiming = buildRealLessonTiming({
      sana,
      boshlanishVaqti: dars.vaqtOraliq?.boshlanishVaqti,
      tugashVaqti: dars.vaqtOraliq?.tugashVaqti,
    });
    if (!lessonTiming) {
      throw new ApiError(
        409,
        "REAL_LESSON_TIME_INVALID",
        "Dars vaqt oralig'i noto'g'ri: payroll uchun RealLesson yaratib bo'lmadi",
      );
    }

    const existingLesson = await tx.realLesson.findFirst({
      where: {
        organizationId: org.id,
        darsJadvaliId: dars.id,
        startAt: lessonTiming.startAt,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        payrollLines: { select: { id: true }, take: 1 },
      },
    });

    const baseAuditAfter = {
      darsId,
      sana: sanaIso,
      studentCount: davomatlar.length,
      createdDavomatCount: davomatCreates.length,
      updatedDavomatCount: davomatUpdateOps.length,
      createdBahoCount: bahoCreates.length,
      updatedBahoCount: bahoUpdateOps.length,
      deletedBahoCount: bahoDeleteIds.length,
    };

    if (!existingLesson) {
      const createdLesson = await tx.realLesson.create({
        data: {
          organizationId: org.id,
          teacherId: dars.oqituvchiId,
          subjectId: dars.fanId,
          classroomId: dars.sinfId,
          darsJadvaliId: dars.id,
          startAt: lessonTiming.startAt,
          endAt: lessonTiming.endAt,
          durationMinutes: lessonTiming.durationMinutes,
          status: "DONE",
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorUserId: userId,
          action: "ATTENDANCE_SAVE",
          entityType: "ATTENDANCE_SESSION",
          entityId: `${darsId}:${sanaIso}`,
          after: buildAttendanceSessionAuditAfter({
            ...baseAuditAfter,
            realLessonId: createdLesson.id,
          }),
        },
      });
      return { realLessonId: createdLesson.id, organizationId: org.id };
    }

    if (existingLesson.payrollLines.length) {
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorUserId: userId,
          action: "ATTENDANCE_SAVE",
          entityType: "ATTENDANCE_SESSION",
          entityId: `${darsId}:${sanaIso}`,
          after: buildAttendanceSessionAuditAfter({
            ...baseAuditAfter,
            realLessonId: existingLesson.id,
            payrollLockedLesson: true,
          }),
        },
      });
      return { realLessonId: existingLesson.id, organizationId: org.id };
    }

    const updatedLesson = await tx.realLesson.update({
      where: { id: existingLesson.id },
      data: {
        teacherId: dars.oqituvchiId,
        subjectId: dars.fanId,
        classroomId: dars.sinfId,
        endAt: lessonTiming.endAt,
        durationMinutes: lessonTiming.durationMinutes,
        status: "DONE",
        replacedByTeacherId: null,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        organizationId: org.id,
        actorUserId: userId,
        action: "ATTENDANCE_SAVE",
        entityType: "ATTENDANCE_SESSION",
        entityId: `${darsId}:${sanaIso}`,
        after: buildAttendanceSessionAuditAfter({
          ...baseAuditAfter,
          realLessonId: updatedLesson.id,
        }),
      },
    });
    return { realLessonId: updatedLesson.id, organizationId: org.id };
  });

  let payrollAutoRun = { refreshed: false, skipped: false, reason: null };
  try {
    await refreshDraftPayrollForLesson({
      lessonId: txResult.realLessonId,
      actorUserId: userId,
      req: null,
    });
    payrollAutoRun = { refreshed: true, skipped: false, reason: null };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === "PAYROLL_RUN_LOCKED" || error.code === "PAYROLL_RATE_NOT_FOUND")
    ) {
      payrollAutoRun = { refreshed: false, skipped: true, reason: error.code };
    } else {
      throw error;
    }
  }

  return {
    sana: sanaIso,
    count: davomatlar.length,
    payrollAutoRun,
  };
}

module.exports = {
  executeSaveTeacherAttendanceSession,
};
