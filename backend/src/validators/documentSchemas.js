const { z } = require("zod");

const emptyToUndef = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const cuidOpt = z.preprocess(emptyToUndef, z.string().cuid().optional());

const DocumentKindEnum = z.enum([
  "PASSPORT",
  "CONTRACT",
  "CERTIFICATE",
  "DIPLOMA",
  "MEDICAL",
  "OTHER",
]);

const OwnerSchema = z
  .object({
    adminId: cuidOpt,
    teacherId: cuidOpt,
    studentId: cuidOpt,
  })
  .refine(
    (d) => [d.adminId, d.teacherId, d.studentId].filter(Boolean).length === 1,
    {
      message:
        "Hujjat kimga tegishli ekanini bering: adminId yoki teacherId yoki studentId (faqat bittasi)",
      path: ["owner"],
    },
  );

const UploadDocumentBodySchema = OwnerSchema.extend({
  kind: z
    .preprocess(emptyToUndef, DocumentKindEnum)
    .optional()
    .default("OTHER"),
  title: z
    .preprocess(
      emptyToUndef,
      z.string().max(200, "title 200 belgidan oshmasin"),
    )
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});

const UpdateDocumentBodySchema = z.object({
  kind: z.preprocess(emptyToUndef, DocumentKindEnum).optional(),
  title: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    }),
});

const ListDocumentsQuerySchema = z.object({
  adminId: cuidOpt,
  teacherId: cuidOpt,
  studentId: cuidOpt,
  kind: z.preprocess(emptyToUndef, DocumentKindEnum).optional(),
});

const IdParamSchema = z.object({
  id: z.string().cuid(),
});

module.exports = {
  UploadDocumentBodySchema,
  UpdateDocumentBodySchema,
  ListDocumentsQuerySchema,
  IdParamSchema,
};
