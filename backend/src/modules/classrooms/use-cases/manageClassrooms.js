const prisma = require("../../../prisma");
const { ApiError } = require("../../../utils/apiError");
const {
  syncStudentsMajburiyatByMainSettings,
} = require("../../../services/financeMajburiyatService");
const classroomRepository = require("../repository");
const { moveActiveEnrollments } = require("./moveActiveEnrollments");

async function createClassroom({ name, academicYear }) {
  const existing = await classroomRepository.findClassroomByNameAndAcademicYear({
    name,
    academicYear,
  });

  if (existing && !existing.isArchived) {
    throw new ApiError(409, "CLASSROOM_EXISTS", "Bunday sinf allaqachon mavjud");
  }

  if (existing?.isArchived) {
    const classroom = await classroomRepository.restoreArchivedClassroom(existing.id);
    return { ok: true, classroom, restored: true };
  }

  const classroom = await classroomRepository.createClassroom({ name, academicYear });
  return { ok: true, classroom, restored: false };
}

async function deleteClassroom({ classroomId }) {
  const classroom = await classroomRepository.findClassroomById(classroomId);
  if (!classroom) {
    throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  }
  if (classroom.isArchived) {
    return { ok: true };
  }

  const activeEnrollments = await classroomRepository.countActiveEnrollmentsForClassroom(
    classroomId,
  );
  if (activeEnrollments > 0) {
    throw new ApiError(
      409,
      "CLASSROOM_IN_USE",
      "Bu sinfga faol studentlar biriktirilgan, o'chirib bo'lmaydi",
    );
  }

  await classroomRepository.archiveClassroom(classroomId);
  return { ok: true };
}

async function removeStudentFromClassroom({ classroomId, studentId }) {
  const [classroom, student] = await Promise.all([
    classroomRepository.findClassroomById(classroomId),
    classroomRepository.findStudentById(studentId),
  ]);

  if (!classroom || classroom.isArchived) {
    throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  }
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const result = await classroomRepository.deactivateStudentEnrollmentInClassroom(
    {
      classroomId,
      studentId,
      endedAt: new Date(),
    },
  );

  if (result.count === 0) {
    throw new ApiError(
      409,
      "ENROLLMENT_REQUIRED",
      "Student bu sinfga aktiv holatda biriktirilmagan",
    );
  }

  return {
    ok: true,
    removed: true,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academicYear,
    },
    studentId,
  };
}

async function previewPromoteClassroom({ sourceClassroomId, targetClassroomId }) {
  if (sourceClassroomId === targetClassroomId) {
    throw new ApiError(
      400,
      "INVALID_TARGET",
      "Manba va maqsad sinf bir xil bo'lmasligi kerak",
    );
  }

  const [sourceClassroom, targetClassroom] = await Promise.all([
    classroomRepository.findClassroomById(sourceClassroomId),
    classroomRepository.findClassroomById(targetClassroomId),
  ]);

  if (!sourceClassroom || sourceClassroom.isArchived) {
    throw new ApiError(404, "SOURCE_CLASSROOM_NOT_FOUND", "Manba sinf topilmadi");
  }
  if (!targetClassroom || targetClassroom.isArchived) {
    throw new ApiError(404, "TARGET_CLASSROOM_NOT_FOUND", "Maqsad sinf topilmadi");
  }

  const activeEnrollments = await classroomRepository.listActiveEnrollmentsWithStudentPreview(
    sourceClassroomId,
  );

  const students = activeEnrollments
    .map((enrollment) => ({
      studentId: enrollment.studentId,
      fullName: `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim(),
      username: enrollment.student.user?.username || "-",
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "uz"));

  return {
    ok: true,
    sourceClassroom,
    targetClassroom,
    totalStudents: students.length,
    studentsPreview: students.slice(0, 20),
    note:
      students.length > 20
        ? `Jami ${students.length} ta. Dastlabki 20 ta student ko'rsatildi.`
        : null,
  };
}

async function promoteClassroom({
  sourceClassroomId,
  targetClassroomId,
  translate,
}) {
  if (sourceClassroomId === targetClassroomId) {
    throw new ApiError(
      400,
      "INVALID_TARGET",
      "Manba va maqsad sinf bir xil bo'lmasligi kerak",
    );
  }

  const [sourceClassroom, targetClassroom] = await Promise.all([
    classroomRepository.findClassroomById(sourceClassroomId),
    classroomRepository.findClassroomById(targetClassroomId),
  ]);

  if (!sourceClassroom || sourceClassroom.isArchived) {
    throw new ApiError(404, "SOURCE_CLASSROOM_NOT_FOUND", "Manba sinf topilmadi");
  }
  if (!targetClassroom || targetClassroom.isArchived) {
    throw new ApiError(404, "TARGET_CLASSROOM_NOT_FOUND", "Maqsad sinf topilmadi");
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const moved = await moveActiveEnrollments({
      tx,
      sourceClassroomId,
      targetClassroomId,
      at: now,
    });

    return {
      movedCount: moved.movedCount,
      studentIds: moved.studentIds,
    };
  });

  if (result.studentIds.length) {
    await syncStudentsMajburiyatByMainSettings({
      studentIds: result.studentIds,
      futureMonths: 3,
    });
  }

  return {
    ok: true,
    movedCount: result.movedCount,
    sourceClassroom,
    targetClassroom,
    message:
      result.movedCount > 0
        ? translate?.("messages.CLASSROOM_PROMOTED", result.movedCount)
        : translate?.("messages.CLASSROOM_PROMOTION_EMPTY"),
  };
}

module.exports = {
  createClassroom,
  deleteClassroom,
  removeStudentFromClassroom,
  previewPromoteClassroom,
  promoteClassroom,
};
