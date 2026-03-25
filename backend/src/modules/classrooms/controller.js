const classroomQueries = require("./use-cases/queryClassrooms");
const classroomCommands = require("./use-cases/manageClassrooms");
const annualPromotion = require("./use-cases/annualPromotion");

async function getClassrooms(_req, res) {
  res.json(await classroomQueries.listClassrooms());
}

async function getClassroomsMeta(_req, res) {
  res.json(await classroomQueries.getClassroomsMeta());
}

async function getClassroomStudents(req, res) {
  res.json(
    await classroomQueries.getClassroomStudents({
      classroomId: req.params.id,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search || null,
    }),
  );
}

async function createClassroom(req, res) {
  const result = await classroomCommands.createClassroom(req.body);
  res.status(201).json(result);
}

async function deleteClassroom(req, res) {
  res.json(
    await classroomCommands.deleteClassroom({
      classroomId: req.params.id,
    }),
  );
}

async function removeStudentFromClassroom(req, res) {
  res.json(
    await classroomCommands.removeStudentFromClassroom({
      classroomId: req.params.classroomId,
      studentId: req.params.studentId,
    }),
  );
}

async function previewPromoteClassroom(req, res) {
  res.json(
    await classroomCommands.previewPromoteClassroom({
      sourceClassroomId: req.params.id,
      targetClassroomId: req.body.targetClassroomId,
    }),
  );
}

async function promoteClassroom(req, res) {
  res.json(
    await classroomCommands.promoteClassroom({
      sourceClassroomId: req.params.id,
      targetClassroomId: req.body.targetClassroomId,
      translate: req.t.bind(req),
    }),
  );
}

async function previewAnnualClassPromotion(_req, res) {
  res.json(await annualPromotion.previewAnnualPromotion());
}

async function runAnnualClassPromotion(req, res) {
  res.json(
    await annualPromotion.runAnnualPromotion({
      force: req.body.force,
      actorUserId: req.user?.sub || null,
      mode: "manual",
      translate: req.t.bind(req),
    }),
  );
}

module.exports = {
  getClassrooms,
  getClassroomsMeta,
  getClassroomStudents,
  createClassroom,
  deleteClassroom,
  removeStudentFromClassroom,
  previewPromoteClassroom,
  promoteClassroom,
  previewAnnualClassPromotion,
  runAnnualClassPromotion,
};
