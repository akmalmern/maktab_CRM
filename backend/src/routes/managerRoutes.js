const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const manager = require("../controllers/manager/debtorController");
const finance = require("../controllers/admin/financeController");
const {
  managerDebtorsQuerySchema,
  managerNotesQuerySchema,
  studentIdParamSchema,
  createDebtorNoteSchema,
} = require("../validators/managerSchemas");
const {
  studentIdParamSchema: financeStudentIdParamSchema,
  tolovIdParamSchema,
  createPaymentSchema,
  createImtiyozSchema,
  imtiyozIdParamSchema,
  deactivateImtiyozSchema,
} = require("../validators/financeSchemas");

router.get(
  "/sinflar",
  requireAuth,
  requireRole("MANAGER"),
  asyncHandler(manager.getManagerClassrooms),
);

router.get(
  "/qarzdorlar",
  requireAuth,
  requireRole("MANAGER"),
  validate({ query: managerDebtorsQuerySchema }),
  asyncHandler(manager.getDebtors),
);

router.get(
  "/qarzdorlar/:studentId/izohlar",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: studentIdParamSchema, query: managerNotesQuerySchema }),
  asyncHandler(manager.getDebtorNotes),
);

router.post(
  "/qarzdorlar/:studentId/izohlar",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: studentIdParamSchema, body: createDebtorNoteSchema }),
  asyncHandler(manager.createDebtorNote),
);

router.get(
  "/tolov/students/:studentId",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: financeStudentIdParamSchema }),
  asyncHandler(finance.getStudentFinanceDetail),
);

router.post(
  "/tolov/students/:studentId/preview",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: financeStudentIdParamSchema, body: createPaymentSchema }),
  asyncHandler(finance.previewStudentPayment),
);

router.post(
  "/tolov/students/:studentId",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: financeStudentIdParamSchema, body: createPaymentSchema }),
  asyncHandler(finance.createStudentPayment),
);

router.post(
  "/tolov/students/:studentId/imtiyoz",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: financeStudentIdParamSchema, body: createImtiyozSchema }),
  asyncHandler(finance.createStudentImtiyoz),
);

router.patch(
  "/tolov/imtiyoz/:imtiyozId",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: imtiyozIdParamSchema, body: deactivateImtiyozSchema }),
  asyncHandler(finance.deactivateStudentImtiyoz),
);

router.delete(
  "/tolov/:tolovId",
  requireAuth,
  requireRole("MANAGER"),
  validate({ params: tolovIdParamSchema }),
  asyncHandler(finance.revertPayment),
);

module.exports = router;
