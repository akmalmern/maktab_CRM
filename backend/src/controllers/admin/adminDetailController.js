const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");

function withDownloadUrl(doc) {
  return {
    ...doc,
    downloadUrl: `/api/admin/docs/${doc.id}/download`,
  };
}

async function getStudentDetail(req, res) {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
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

  res.json({
    ok: true,
    student: {
      ...student,
      documents: student.documents.map(withDownloadUrl),
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

  res.json({
    ok: true,
    teacher: {
      ...teacher,
      documents: teacher.documents.map(withDownloadUrl),
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
    message: "Parol muvaffaqiyatli yangilandi",
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
    message: "Parol muvaffaqiyatli yangilandi",
    user: { username: student.user.username },
  });
}

module.exports = {
  getStudentDetail,
  getTeacherDetail,
  resetTeacherPassword,
  resetStudentPassword,
};
