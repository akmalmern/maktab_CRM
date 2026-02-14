const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { uploadDoc, handleMulterErrors } = require("../middlewares/uploads");
const { validate } = require("../middlewares/validate");

const c = require("../controllers/admin/documentController");
const {
  UploadDocumentBodySchema,
  UpdateDocumentBodySchema,
  ListDocumentsQuerySchema,
  IdParamSchema,
} = require("../validators/documentSchemas");

// ✅ ADD
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  uploadDoc.single("file"),
  handleMulterErrors,
  validate({ body: UploadDocumentBodySchema }),
  asyncHandler(c.adminUploadDocument),
);

// ✅ UPDATE META
router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema, body: UpdateDocumentBodySchema }),
  asyncHandler(c.adminUpdateDocument),
);

// ✅ DELETE
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema }),
  asyncHandler(c.adminDeleteDocument),
);

// ✅ LIST
router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: ListDocumentsQuerySchema }),
  asyncHandler(c.adminListDocuments),
);

module.exports = router;
