const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate, validateBody } = require("../middlewares/validate");
const {
  managerFinanceCommandRateLimit,
  managerHeavyQueryRateLimit,
} = require("../middlewares/rateLimit");
const {
  uploadAvatar,
  verifyUploadedAvatarSignature,
  handleMulterErrors,
} = require("../middlewares/avatarUpload");
const manager = require("../controllers/manager/debtorController");
const finance = require("../controllers/admin/financeController");
const { createSelfServiceHandlers } = require("../controllers/user/selfServiceController");
const {
  managerDebtorsQuerySchema,
  managerNotesQuerySchema,
  studentIdParamSchema,
  createDebtorNoteSchema,
} = require("../validators/managerSchemas");
const {
  studentIdParamSchema: financeStudentIdParamSchema,
  tolovIdParamSchema,
  partialRevertPaymentSchema,
  createPaymentSchema,
  createImtiyozSchema,
  imtiyozIdParamSchema,
  deactivateImtiyozSchema,
} = require("../validators/financeSchemas");
const {
  selfProfileUpdateSchema,
  selfPasswordChangeSchema,
} = require("../validators/selfProfileSchemas");
const managerProfilePaths = ["/profil", "/profile"];
const managerProfilePasswordPaths = ["/profil/password", "/profile/password"];
const managerProfileAvatarPaths = ["/profil/avatar", "/profile/avatar"];
const selfService = createSelfServiceHandlers("MANAGER");

router.patch(
  managerProfilePaths,
  requireAuth,
  requireRole("MANAGER"),
  validateBody(selfProfileUpdateSchema),
  asyncHandler(selfService.updateProfile),
);

router.post(
  managerProfilePasswordPaths,
  requireAuth,
  requireRole("MANAGER"),
  validateBody(selfPasswordChangeSchema),
  asyncHandler(selfService.changePassword),
);

router.post(
  managerProfileAvatarPaths,
  requireAuth,
  requireRole("MANAGER"),
  uploadAvatar.single("file"),
  verifyUploadedAvatarSignature,
  handleMulterErrors,
  asyncHandler(selfService.uploadAvatar),
);

router.delete(
  managerProfileAvatarPaths,
  requireAuth,
  requireRole("MANAGER"),
  asyncHandler(selfService.deleteAvatar),
);

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
  managerHeavyQueryRateLimit,
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
  managerHeavyQueryRateLimit,
  validate({ params: financeStudentIdParamSchema }),
  asyncHandler(finance.getStudentFinanceDetail),
);

router.post(
  "/tolov/students/:studentId/preview",
  requireAuth,
  requireRole("MANAGER"),
  managerFinanceCommandRateLimit,
  validate({ params: financeStudentIdParamSchema, body: createPaymentSchema }),
  asyncHandler(finance.previewStudentPayment),
);

router.post(
  "/tolov/students/:studentId",
  requireAuth,
  requireRole("MANAGER"),
  managerFinanceCommandRateLimit,
  validate({ params: financeStudentIdParamSchema, body: createPaymentSchema }),
  asyncHandler(finance.createStudentPayment),
);

router.post(
  "/tolov/students/:studentId/imtiyoz",
  requireAuth,
  requireRole("MANAGER"),
  managerFinanceCommandRateLimit,
  validate({ params: financeStudentIdParamSchema, body: createImtiyozSchema }),
  asyncHandler(finance.createStudentImtiyoz),
);

router.patch(
  "/tolov/imtiyoz/:imtiyozId",
  requireAuth,
  requireRole("MANAGER"),
  managerFinanceCommandRateLimit,
  validate({ params: imtiyozIdParamSchema, body: deactivateImtiyozSchema }),
  asyncHandler(finance.deactivateStudentImtiyoz),
);

router.delete(
  "/tolov/:tolovId",
  requireAuth,
  requireRole("MANAGER"),
  managerFinanceCommandRateLimit,
  validate({ params: tolovIdParamSchema }),
  asyncHandler(finance.revertPayment),
);

router.post(
  "/tolov/:tolovId/partial-revert",
  requireAuth,
  requireRole("MANAGER"),
  managerFinanceCommandRateLimit,
  validate({ params: tolovIdParamSchema, body: partialRevertPaymentSchema }),
  asyncHandler(finance.partialRevertPayment),
);

module.exports = router;
