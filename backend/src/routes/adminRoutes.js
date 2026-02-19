const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate, validateBody } = require("../middlewares/validate");
const { z } = require("zod");

const people = require("../controllers/admin/peopleController");
const subjects = require("../controllers/admin/subjectController");
const classrooms = require("../controllers/admin/classroomController");
const jadval = require("../controllers/admin/jadvalController");
const attendance = require("../controllers/admin/attendanceController");
const grades = require("../controllers/admin/gradeController");
const finance = require("../controllers/admin/financeController");
const {
  createTeacherSchema,
  createStudentSchema,
  createSubjectSchema,
  createClassroomSchema,
  promoteClassroomSchema,
  annualClassPromotionSchema,
} = require("../validators/adminCreateSchemas");
const {
  listTeachersQuerySchema,
  listStudentsQuerySchema,
} = require("../validators/adminListSchemas");
const {
  createVaqtOraliqSchema,
  createDarsJadvaliSchema,
  updateDarsJadvaliSchema,
  listDarsJadvaliQuerySchema,
  idParamSchema,
} = require("../validators/jadvalSchemas");
const { adminHisobotQuerySchema } = require("../validators/attendanceSchemas");
const { listBaholarQuerySchema } = require("../validators/gradeSchemas");
const {
  financeSettingsSchema,
  financeStudentsQuerySchema,
  studentIdParamSchema,
  tolovIdParamSchema,
  createPaymentSchema,
  createImtiyozSchema,
  imtiyozIdParamSchema,
  deactivateImtiyozSchema,
  financeExportQuerySchema,
  financeTarifIdParamSchema,
  financeTarifRollbackSchema,
} = require("../validators/financeSchemas");
const SubjectIdParamSchema = z.object({ id: z.string().cuid() });
const ClassroomIdParamSchema = z.object({ id: z.string().cuid() });

router.post(
  "/teachers",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createTeacherSchema),
  asyncHandler(people.createTeacher),
);

router.post(
  "/students",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createStudentSchema),
  asyncHandler(people.createStudent),
);
router.get(
  "/teachers",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: listTeachersQuerySchema }),
  asyncHandler(people.getTeachers),
);
router.get(
  "/students",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: listStudentsQuerySchema }),
  asyncHandler(people.getStudents),
);
router.get(
  "/subjects",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(subjects.getSubjects),
);
router.post(
  "/subjects",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createSubjectSchema),
  asyncHandler(subjects.createSubject),
);
router.get(
  "/classrooms",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(classrooms.getClassrooms),
);
router.post(
  "/classrooms",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createClassroomSchema),
  asyncHandler(classrooms.createClassroom),
);
router.post(
  "/classrooms/:id/promote-preview",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: ClassroomIdParamSchema, body: promoteClassroomSchema }),
  asyncHandler(classrooms.previewPromoteClassroom),
);
router.post(
  "/classrooms/:id/promote",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: ClassroomIdParamSchema, body: promoteClassroomSchema }),
  asyncHandler(classrooms.promoteClassroom),
);
router.get(
  "/classrooms/yillik-otkazish/preview",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(classrooms.previewAnnualClassPromotion),
);
router.post(
  "/classrooms/yillik-otkazish",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(annualClassPromotionSchema),
  asyncHandler(classrooms.runAnnualClassPromotion),
);

router.delete(
  "/teachers/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(people.deleteTeacher),
);
router.delete(
  "/students/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(people.deleteStudent),
);
router.delete(
  "/subjects/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: SubjectIdParamSchema }),
  asyncHandler(subjects.deleteSubject),
);
router.delete(
  "/classrooms/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: ClassroomIdParamSchema }),
  asyncHandler(classrooms.deleteClassroom),
);

// Jadval: vaqt oraliqlari
router.get(
  "/vaqt-oraliqlari",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(jadval.getVaqtOraliqlari),
);
router.post(
  "/vaqt-oraliqlari",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createVaqtOraliqSchema),
  asyncHandler(jadval.createVaqtOraliq),
);
router.delete(
  "/vaqt-oraliqlari/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(jadval.deleteVaqtOraliq),
);

// Jadval: darslar
router.get(
  "/dars-jadval",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: listDarsJadvaliQuerySchema }),
  asyncHandler(jadval.getDarsJadvali),
);
router.post(
  "/dars-jadval",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createDarsJadvaliSchema),
  asyncHandler(jadval.createDarsJadvali),
);
router.patch(
  "/dars-jadval/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: idParamSchema, body: updateDarsJadvaliSchema }),
  asyncHandler(jadval.updateDarsJadvali),
);
router.delete(
  "/dars-jadval/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(jadval.deleteDarsJadvali),
);

router.get(
  "/davomat/hisobot",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: adminHisobotQuerySchema }),
  asyncHandler(attendance.getAttendanceReport),
);
router.get(
  "/davomat/hisobot/export/pdf",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: adminHisobotQuerySchema }),
  asyncHandler(attendance.exportAttendanceReportPdf),
);
router.get(
  "/davomat/hisobot/export/xlsx",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: adminHisobotQuerySchema }),
  asyncHandler(attendance.exportAttendanceReportXlsx),
);

router.get(
  "/baholar",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: listBaholarQuerySchema }),
  asyncHandler(grades.getAdminBaholar),
);

router.get(
  "/moliya/settings",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(finance.getFinanceSettings),
);
router.patch(
  "/moliya/settings",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(financeSettingsSchema),
  asyncHandler(finance.upsertFinanceSettings),
);
router.post(
  "/moliya/tariflar/:tarifId/rollback",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: financeTarifIdParamSchema, body: financeTarifRollbackSchema }),
  asyncHandler(finance.rollbackFinanceTarif),
);
router.get(
  "/moliya/students",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: financeStudentsQuerySchema }),
  asyncHandler(finance.getFinanceStudents),
);
router.get(
  "/moliya/students/export/xlsx",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: financeExportQuerySchema }),
  asyncHandler(finance.exportDebtorsXlsx),
);
router.get(
  "/moliya/students/export/pdf",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: financeExportQuerySchema }),
  asyncHandler(finance.exportDebtorsPdf),
);
router.get(
  "/moliya/students/:studentId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: studentIdParamSchema }),
  asyncHandler(finance.getStudentFinanceDetail),
);
router.post(
  "/moliya/students/:studentId/tolov",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: studentIdParamSchema, body: createPaymentSchema }),
  asyncHandler(finance.createStudentPayment),
);
router.post(
  "/moliya/students/:studentId/imtiyoz",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: studentIdParamSchema, body: createImtiyozSchema }),
  asyncHandler(finance.createStudentImtiyoz),
);
router.delete(
  "/moliya/imtiyoz/:imtiyozId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: imtiyozIdParamSchema, body: deactivateImtiyozSchema }),
  asyncHandler(finance.deactivateStudentImtiyoz),
);
router.delete(
  "/moliya/tolov/:tolovId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: tolovIdParamSchema }),
  asyncHandler(finance.revertPayment),
);

module.exports = router;
