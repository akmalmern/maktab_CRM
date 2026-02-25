const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");

function withDownloadUrl(doc) {
  return {
    ...doc,
    downloadUrl: `/api/admin/docs/${doc.id}/download`,
  };
}

function mapGradeRow(row) {
  return {
    id: row.id,
    sana: row.sana,
    turi: row.turi,
    ball: row.ball,
    maxBall: row.maxBall,
    izoh: row.izoh || "",
    teacher: row.teacher || null,
    student: row.student || null,
    darsJadvali: row.darsJadvali || null,
  };
}

function mapAttendanceRow(row) {
  return {
    id: row.id,
    sana: row.sana,
    holat: row.holat,
    izoh: row.izoh || "",
    darsJadvali: row.darsJadvali || null,
  };
}

async function getStudentDetail(req, res) {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        take: 1,
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              academicYear: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const activeClassroomId =
    student.enrollments?.find((enrollment) => enrollment.isActive)?.classroomId || null;
  const classmates = activeClassroomId
    ? await prisma.student.findMany({
        where: {
          id: { not: student.id },
          user: { isActive: true },
          enrollments: {
            some: { isActive: true, classroomId: activeClassroomId },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { username: true, phone: true } },
          enrollments: {
            where: { isActive: true, classroomId: activeClassroomId },
            take: 1,
            include: {
              classroom: {
                select: { id: true, name: true, academicYear: true },
              },
            },
          },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      })
    : [];

  const [
    enrollmentHistory,
    recentGrades,
    recentAttendance,
    gradeStats,
    attendanceStats,
    totalGrades,
    totalAttendance,
    totalPayments,
    debtAgg,
    recentPayments,
  ] =
    await prisma.$transaction([
      prisma.enrollment.findMany({
        where: { studentId: student.id },
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }, { createdAt: "desc" }],
        include: {
          classroom: {
            select: { id: true, name: true, academicYear: true },
          },
        },
      }),
      prisma.baho.findMany({
        where: { studentId: student.id },
        take: 20,
        orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
          darsJadvali: {
            select: {
              id: true,
              fan: { select: { id: true, name: true } },
              sinf: { select: { id: true, name: true, academicYear: true } },
              vaqtOraliq: { select: { id: true, nomi: true, boshlanishVaqti: true } },
            },
          },
        },
      }),
      prisma.davomat.findMany({
        where: { studentId: student.id },
        take: 20,
        orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
        include: {
          darsJadvali: {
            select: {
              id: true,
              fan: { select: { id: true, name: true } },
              sinf: { select: { id: true, name: true, academicYear: true } },
              vaqtOraliq: { select: { id: true, nomi: true, boshlanishVaqti: true } },
              oqituvchi: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.baho.groupBy({
        by: ["turi"],
        where: { studentId: student.id },
        _count: { _all: true },
        _sum: { ball: true, maxBall: true },
      }),
      prisma.davomat.groupBy({
        by: ["holat"],
        where: { studentId: student.id },
        _count: { _all: true },
      }),
      prisma.baho.count({ where: { studentId: student.id } }),
      prisma.davomat.count({ where: { studentId: student.id } }),
      prisma.tolovTranzaksiya.count({ where: { studentId: student.id, holat: "AKTIV" } }),
      prisma.studentOyMajburiyat.aggregate({
        where: { studentId: student.id, qoldiqSumma: { gt: 0 } },
        _count: { _all: true },
        _sum: { qoldiqSumma: true },
      }),
      prisma.tolovTranzaksiya.findMany({
        where: { studentId: student.id },
        take: 10,
        orderBy: [{ tolovSana: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          turi: true,
          holat: true,
          summa: true,
          tolovSana: true,
          createdAt: true,
          qoplamalar: { select: { yil: true, oy: true, summa: true } },
        },
      }),
    ]);

  res.json({
    ok: true,
    student: {
      ...student,
      enrollments: enrollmentHistory,
      documents: student.documents.map(withDownloadUrl),
      studentsList: classmates,
      activity: {
        metrics: {
          totalGrades: totalGrades || 0,
          totalAttendance: totalAttendance || 0,
          totalDocuments: student.documents.length,
          totalPayments: totalPayments || 0,
          debtMonths: Number(debtAgg?._count?._all || 0),
          debtAmount: Number(debtAgg?._sum?.qoldiqSumma || 0),
          isArchived: !student.user?.isActive,
        },
        gradeStats,
        attendanceStats,
        recentGrades: recentGrades.map(mapGradeRow),
        recentAttendance: recentAttendance.map(mapAttendanceRow),
        recentPayments,
      },
    },
  });
}

async function getTeacherDetail(req, res) {
  const { id } = req.params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!teacher) {
    throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  }

  const teacherClassrooms = await prisma.darsJadvali.findMany({
    where: { oqituvchiId: teacher.id },
    select: { sinfId: true },
    distinct: ["sinfId"],
  });
  const teacherClassroomIds = teacherClassrooms.map((row) => row.sinfId).filter(Boolean);
  const studentsList = teacherClassroomIds.length
    ? await prisma.student.findMany({
        where: {
          user: { isActive: true },
          enrollments: {
            some: { isActive: true, classroomId: { in: teacherClassroomIds } },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { username: true, phone: true } },
          enrollments: {
            where: { isActive: true },
            take: 1,
            include: {
              classroom: {
                select: { id: true, name: true, academicYear: true },
              },
            },
          },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      })
    : [];

  const [
    teachingClassrooms,
    recentGivenGrades,
    recentMarkedAttendance,
    gradeStats,
    attendanceStats,
    totalGrades,
    totalAttendance,
    totalScheduleRows,
  ] =
    await prisma.$transaction([
      prisma.darsJadvali.findMany({
        where: { oqituvchiId: teacher.id },
        distinct: ["sinfId"],
        select: {
          sinfId: true,
          sinf: { select: { id: true, name: true, academicYear: true } },
        },
        orderBy: { sinfId: "asc" },
      }),
      prisma.baho.findMany({
        where: { teacherId: teacher.id },
        take: 20,
        orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          darsJadvali: {
            select: {
              id: true,
              fan: { select: { id: true, name: true } },
              sinf: { select: { id: true, name: true, academicYear: true } },
              vaqtOraliq: { select: { id: true, nomi: true, boshlanishVaqti: true } },
            },
          },
        },
      }),
      prisma.davomat.findMany({
        where: { belgilaganTeacherId: teacher.id },
        take: 20,
        orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
        include: {
          darsJadvali: {
            select: {
              id: true,
              fan: { select: { id: true, name: true } },
              sinf: { select: { id: true, name: true, academicYear: true } },
              vaqtOraliq: { select: { id: true, nomi: true, boshlanishVaqti: true } },
            },
          },
        },
      }),
      prisma.baho.groupBy({
        by: ["turi"],
        where: { teacherId: teacher.id },
        _count: { _all: true },
        _sum: { ball: true, maxBall: true },
      }),
      prisma.davomat.groupBy({
        by: ["holat"],
        where: { belgilaganTeacherId: teacher.id },
        _count: { _all: true },
      }),
      prisma.baho.count({ where: { teacherId: teacher.id } }),
      prisma.davomat.count({ where: { belgilaganTeacherId: teacher.id } }),
      prisma.darsJadvali.count({ where: { oqituvchiId: teacher.id } }),
    ]);

  res.json({
    ok: true,
    teacher: {
      ...teacher,
      documents: teacher.documents.map(withDownloadUrl),
      studentsList,
      teachingClassrooms: teachingClassrooms.map((row) => row.sinf).filter(Boolean),
      activity: {
        metrics: {
          totalGrades,
          totalAttendance,
          totalScheduleRows,
          totalDocuments: teacher.documents.length,
          totalClassrooms: teachingClassrooms.length,
          isArchived: !teacher.user?.isActive,
        },
        gradeStats,
        attendanceStats,
        recentGrades: recentGivenGrades.map(mapGradeRow),
        recentAttendance: recentMarkedAttendance.map(mapAttendanceRow),
      },
    },
  });
}

async function resetTeacherPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true, user: { select: { id: true, username: true } } },
  });
  if (!teacher) {
    throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: teacher.user.id },
    data: { password: hash },
  });

  res.json({
    ok: true,
    message: req.t("messages.PASSWORD_RESET_SUCCESS"),
    user: { username: teacher.user.username },
  });
}

async function resetStudentPassword(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body;

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, user: { select: { id: true, username: true } } },
  });
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: student.user.id },
    data: { password: hash },
  });

  res.json({
    ok: true,
    message: req.t("messages.PASSWORD_RESET_SUCCESS"),
    user: { username: student.user.username },
  });
}

module.exports = {
  getStudentDetail,
  getTeacherDetail,
  resetTeacherPassword,
  resetStudentPassword,
};
