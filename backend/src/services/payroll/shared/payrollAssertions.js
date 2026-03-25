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

function createPayrollAssertions({ ApiError }) {
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
      if (Object.keys(patch).some((key) => key !== "employeeId")) {
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
    const subject = await tx.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true },
    });
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

  return {
    assertNoTeacherRateOverlap,
    assertNoSubjectDefaultRateOverlap,
    assertTeacherExists,
    assertEmployeeExists,
    ensureEmployeeForTeacher,
    assertSubjectExists,
    assertClassroomExists,
    assertDarsJadvaliExists,
  };
}

module.exports = {
  createPayrollAssertions,
};
