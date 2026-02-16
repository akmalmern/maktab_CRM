const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");

function withDownloadUrl(doc) {
  return {
    ...doc,
    downloadUrl: `/api/docs/${doc.id}/download`,
  };
}

async function getStudentDetail(req, res) {
  const { id } = req.params; // Student.id

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
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

  if (!student)
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");

  res.json({
    ok: true,
    student: {
      ...student,
      documents: student.documents.map(withDownloadUrl),
    },
  });
}

async function getTeacherDetail(req, res) {
  const { id } = req.params; // Teacher.id

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
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

  if (!teacher)
    throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");

  res.json({
    ok: true,
    teacher: {
      ...teacher,
      documents: teacher.documents.map(withDownloadUrl),
    },
  });
}

module.exports = { getStudentDetail, getTeacherDetail };
