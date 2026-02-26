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
const payroll = require("../controllers/admin/payrollController");
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
  listClassroomStudentsQuerySchema,
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
const {
  payrollRunIdParamSchema,
  payrollLineIdParamSchema,
  realLessonIdParamSchema,
  teacherRateIdParamSchema,
  subjectDefaultRateIdParamSchema,
  createTeacherRateSchema,
  updateTeacherRateSchema,
  listTeacherRatesQuerySchema,
  createSubjectDefaultRateSchema,
  updateSubjectDefaultRateSchema,
  listSubjectDefaultRatesQuerySchema,
  createRealLessonSchema,
  updateRealLessonStatusSchema,
  listRealLessonsQuerySchema,
  generatePayrollRunSchema,
  listPayrollRunsQuerySchema,
  payrollRunLinesQuerySchema,
  addPayrollAdjustmentSchema,
  payPayrollRunSchema,
  reversePayrollRunSchema,
} = require("../validators/payrollSchemas");
const SubjectIdParamSchema = z.object({ id: z.string().cuid() });
const ClassroomIdParamSchema = z.object({ id: z.string().cuid() });
const restorePersonBodySchema = z
  .object({
    newUsername: z.string().trim().min(1).max(100).optional(),
    newPhone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .regex(/^[+\d][\d\s\-()]+$/)
      .optional(),
  })
  .strict();

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
router.get(
  "/classrooms/meta",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(classrooms.getClassroomsMeta),
);
router.get(
  "/classrooms/:id/students",
  requireAuth,
  requireRole("ADMIN"),
  validate({
    params: ClassroomIdParamSchema,
    query: listClassroomStudentsQuerySchema,
  }),
  asyncHandler(classrooms.getClassroomStudents),
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
router.post(
  "/teachers/:id/restore",
  requireAuth,
  requireRole("ADMIN"),
  validate({ body: restorePersonBodySchema }),
  asyncHandler(people.restoreTeacher),
);
router.delete(
  "/students/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(people.deleteStudent),
);
router.post(
  "/students/:id/restore",
  requireAuth,
  requireRole("ADMIN"),
  validate({ body: restorePersonBodySchema }),
  asyncHandler(people.restoreStudent),
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
  "/moliya/students/:studentId/tolov/preview",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: studentIdParamSchema, body: createPaymentSchema }),
  asyncHandler(finance.previewStudentPayment),
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

// Payroll (Teacher oylik) - ADMIN / MANAGER
router.get(
  "/moliya/oylik/real-lessons",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ query: listRealLessonsQuerySchema }),
  asyncHandler(payroll.listRealLessons),
);
router.post(
  "/moliya/oylik/real-lessons",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createRealLessonSchema),
  asyncHandler(payroll.createRealLesson),
);
router.patch(
  "/moliya/oylik/real-lessons/:lessonId/status",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: realLessonIdParamSchema, body: updateRealLessonStatusSchema }),
  asyncHandler(payroll.updateRealLessonStatus),
);

router.get(
  "/moliya/oylik/rates/teacher",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ query: listTeacherRatesQuerySchema }),
  asyncHandler(payroll.listTeacherRates),
);
router.post(
  "/moliya/oylik/rates/teacher",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createTeacherRateSchema),
  asyncHandler(payroll.createTeacherRate),
);
router.patch(
  "/moliya/oylik/rates/teacher/:rateId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: teacherRateIdParamSchema, body: updateTeacherRateSchema }),
  asyncHandler(payroll.updateTeacherRate),
);
router.delete(
  "/moliya/oylik/rates/teacher/:rateId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: teacherRateIdParamSchema }),
  asyncHandler(payroll.deleteTeacherRate),
);

router.get(
  "/moliya/oylik/rates/subjects",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ query: listSubjectDefaultRatesQuerySchema }),
  asyncHandler(payroll.listSubjectDefaultRates),
);
router.post(
  "/moliya/oylik/rates/subjects",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createSubjectDefaultRateSchema),
  asyncHandler(payroll.createSubjectDefaultRate),
);
router.patch(
  "/moliya/oylik/rates/subjects/:rateId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: subjectDefaultRateIdParamSchema, body: updateSubjectDefaultRateSchema }),
  asyncHandler(payroll.updateSubjectDefaultRate),
);
router.delete(
  "/moliya/oylik/rates/subjects/:rateId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: subjectDefaultRateIdParamSchema }),
  asyncHandler(payroll.deleteSubjectDefaultRate),
);

router.post(
  "/moliya/oylik/runs/generate",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(generatePayrollRunSchema),
  asyncHandler(payroll.generatePayrollRun),
);
router.get(
  "/moliya/oylik/runs",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ query: listPayrollRunsQuerySchema }),
  asyncHandler(payroll.listPayrollRuns),
);
router.get(
  "/moliya/oylik/runs/:runId",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ params: payrollRunIdParamSchema, query: payrollRunLinesQuerySchema }),
  asyncHandler(payroll.getPayrollRunDetail),
);
router.get(
  "/moliya/oylik/runs/:runId/export/csv",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ params: payrollRunIdParamSchema, query: payrollRunLinesQuerySchema.partial() }),
  asyncHandler(payroll.exportPayrollRunCsv),
);
router.post(
  "/moliya/oylik/runs/:runId/adjustments",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: payrollRunIdParamSchema, body: addPayrollAdjustmentSchema }),
  asyncHandler(payroll.addPayrollAdjustment),
);
router.delete(
  "/moliya/oylik/runs/:runId/adjustments/:lineId",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: payrollRunIdParamSchema.merge(payrollLineIdParamSchema) }),
  asyncHandler(payroll.deletePayrollAdjustment),
);
router.post(
  "/moliya/oylik/runs/:runId/approve",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  validate({ params: payrollRunIdParamSchema }),
  asyncHandler(payroll.approvePayrollRun),
);
router.post(
  "/moliya/oylik/runs/:runId/pay",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: payrollRunIdParamSchema, body: payPayrollRunSchema }),
  asyncHandler(payroll.payPayrollRun),
);
router.post(
  "/moliya/oylik/runs/:runId/reverse",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: payrollRunIdParamSchema, body: reversePayrollRunSchema }),
  asyncHandler(payroll.reversePayrollRun),
);

module.exports = router;
