const classroomRepository = require("../repository");

async function moveActiveEnrollments({
  tx,
  sourceClassroomId,
  targetClassroomId,
  at = new Date(),
}) {
  const activeEnrollments = await classroomRepository.listActiveEnrollmentLinksByClassroom(
    sourceClassroomId,
    tx,
  );

  if (!activeEnrollments.length) {
    return { movedCount: 0, studentIds: [] };
  }

  const enrollmentIds = activeEnrollments.map((row) => row.id);
  const studentIds = [...new Set(activeEnrollments.map((row) => row.studentId))];

  await classroomRepository.deactivateEnrollmentsByIds(enrollmentIds, at, tx);
  await classroomRepository.deactivateActiveEnrollmentsByStudentIds(studentIds, at, tx);
  const created = await classroomRepository.createActiveEnrollments(
    {
      studentIds,
      classroomId: targetClassroomId,
      startedAt: at,
    },
    tx,
  );

  return {
    movedCount: created.count,
    studentIds,
  };
}

module.exports = { moveActiveEnrollments };
