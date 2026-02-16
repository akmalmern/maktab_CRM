// const prisma = require("../../prisma");
// const { ApiError } = require("../../utils/apiError");
// const path = require("path");
// const fs = require("fs");

// function ensureFile(req) {
//   if (!req.file)
//     throw new ApiError(400, "NO_FILE", "Fayl yuborilmadi (form-data: file)");
// }

// async function adminUploadDocument(req, res) {
//   ensureFile(req);

//   const { kind, title, adminId, teacherId, studentId } = req.body;

//   // owner mavjudligini tekshirish
//   if (adminId) {
//     const a = await prisma.admin.findUnique({
//       where: { id: adminId },
//       select: { id: true },
//     });
//     if (!a) throw new ApiError(404, "ADMIN_NOT_FOUND", "Admin topilmadi");
//   }
//   if (teacherId) {
//     const t = await prisma.teacher.findUnique({
//       where: { id: teacherId },
//       select: { id: true },
//     });
//     if (!t) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
//   }
//   if (studentId) {
//     const s = await prisma.student.findUnique({
//       where: { id: studentId },
//       select: { id: true },
//     });
//     if (!s) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
//   }

//   const doc = await prisma.fileDocument.create({
//     data: {
//       kind: kind || "OTHER",
//       title: title ?? null,

//       fileName: req.file.originalname,
//       filePath: `/uploads/docs/${req.file.filename}`,
//       mimeType: req.file.mimetype,
//       sizeBytes: req.file.size,

//       adminId: adminId || null,
//       teacherId: teacherId || null,
//       studentId: studentId || null,
//     },
//   });

//   res.status(201).json({ ok: true, document: doc });
// }

// async function adminUpdateDocument(req, res) {
//   const { id } = req.params;
//   const { kind, title } = req.body;

//   const exists = await prisma.fileDocument.findUnique({ where: { id } });
//   if (!exists) throw new ApiError(404, "DOC_NOT_FOUND", "Hujjat topilmadi");

//   const updated = await prisma.fileDocument.update({
//     where: { id },
//     data: {
//       kind: kind ?? undefined,
//       title: title === undefined ? undefined : title, // null ham bo‘lishi mumkin
//     },
//   });

//   res.json({ ok: true, document: updated });
// }

// async function adminDeleteDocument(req, res) {
//   const { id } = req.params;

//   const doc = await prisma.fileDocument.findUnique({ where: { id } });
//   if (!doc) throw new ApiError(404, "DOC_NOT_FOUND", "Hujjat topilmadi");

//   await prisma.fileDocument.delete({ where: { id } });

//   // diskdan o‘chirish (best-effort)
//   try {
//     const abs = path.join(process.cwd(), doc.filePath.replace(/^\//, ""));
//     if (fs.existsSync(abs)) fs.unlinkSync(abs);
//   } catch (_) {}

//   res.json({ ok: true });
// }

// async function adminListDocuments(req, res) {
//   const { adminId, teacherId, studentId, kind } = req.query;

//   const where = {};
//   if (adminId) where.adminId = adminId;
//   if (teacherId) where.teacherId = teacherId;
//   if (studentId) where.studentId = studentId;
//   if (kind) where.kind = kind;

//   const docs = await prisma.fileDocument.findMany({
//     where,
//     orderBy: { createdAt: "desc" },
//   });

//   res.json({ ok: true, documents: docs });
// }

// module.exports = {
//   adminUploadDocument,
//   adminUpdateDocument,
//   adminDeleteDocument,
//   adminListDocuments,
// };
const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const path = require("path");
const fs = require("fs");

function ensureFile(req) {
  if (!req.file)
    throw new ApiError(400, "NO_FILE", "Fayl yuborilmadi (form-data: file)");
}

async function adminUploadDocument(req, res) {
  ensureFile(req);

  const { kind, title, adminId, teacherId, studentId } = req.body;

  // owner mavjudligini tekshirish
  if (adminId) {
    const a = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });
    if (!a) throw new ApiError(404, "ADMIN_NOT_FOUND", "Admin topilmadi");
  }
  if (teacherId) {
    const t = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!t) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  }
  if (studentId) {
    const s = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!s) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const doc = await prisma.fileDocument.create({
    data: {
      kind: kind || "OTHER",
      title: title ?? null,

      fileName: req.file.originalname,
      filePath: `/uploads/docs/${req.file.filename}`,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,

      adminId: adminId || null,
      teacherId: teacherId || null,
      studentId: studentId || null,
    },
  });

  res.status(201).json({ ok: true, document: doc });
}

async function adminUpdateDocument(req, res) {
  const { id } = req.params;
  const { kind, title } = req.body;

  const exists = await prisma.fileDocument.findUnique({ where: { id } });
  if (!exists) throw new ApiError(404, "DOC_NOT_FOUND", "Hujjat topilmadi");

  const updated = await prisma.fileDocument.update({
    where: { id },
    data: {
      kind: kind ?? undefined,
      title: title === undefined ? undefined : title, // null ham bo‘lishi mumkin
    },
  });

  res.json({ ok: true, document: updated });
}

async function adminDeleteDocument(req, res) {
  const { id } = req.params;

  const doc = await prisma.fileDocument.findUnique({ where: { id } });
  if (!doc) throw new ApiError(404, "DOC_NOT_FOUND", "Hujjat topilmadi");

  await prisma.fileDocument.delete({ where: { id } });

  // diskdan o‘chirish (best-effort)
  try {
    const abs = path.join(process.cwd(), doc.filePath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {}

  res.json({ ok: true });
}

async function adminListDocuments(req, res) {
  const { adminId, teacherId, studentId, kind } = req.query;

  const where = {};
  if (adminId) where.adminId = adminId;
  if (teacherId) where.teacherId = teacherId;
  if (studentId) where.studentId = studentId;
  if (kind) where.kind = kind;

  const docs = await prisma.fileDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json({ ok: true, documents: docs });
}

async function adminDownloadDocument(req, res) {
  const { id } = req.params;

  const doc = await prisma.fileDocument.findUnique({ where: { id } });
  if (!doc) throw new ApiError(404, "DOC_NOT_FOUND", "Hujjat topilmadi");

  const abs = path.join(process.cwd(), doc.filePath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    throw new ApiError(404, "FILE_NOT_FOUND", "Fayl diskda topilmadi");
  }

  // Browser file nomi bilan yuklab oladi
  res.download(abs, doc.fileName);
}

module.exports = {
  adminUploadDocument,
  adminUpdateDocument,
  adminDeleteDocument,
  adminListDocuments,
  adminDownloadDocument,
};
