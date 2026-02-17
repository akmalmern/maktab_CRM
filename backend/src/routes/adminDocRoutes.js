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

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  uploadDoc.single("file"),
  handleMulterErrors,
  validate({ body: UploadDocumentBodySchema }),
  asyncHandler(c.adminUploadDocument),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema, body: UpdateDocumentBodySchema }),
  asyncHandler(c.adminUpdateDocument),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema }),
  asyncHandler(c.adminDeleteDocument),
);

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  validate({ query: ListDocumentsQuerySchema }),
  asyncHandler(c.adminListDocuments),
);

router.get(
  "/:id/download",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema }),
  asyncHandler(c.adminDownloadDocument),
);

module.exports = router;
