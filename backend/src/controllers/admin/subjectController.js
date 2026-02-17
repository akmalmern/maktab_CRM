const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { cleanOptional } = require("./helpers");

async function getSubjects(_req, res) {
  const items = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  res.json({ ok: true, subjects: items });
}

async function createSubject(req, res) {
  const name = cleanOptional(req.body.name);
  if (!name) throw new ApiError(400, "VALIDATION_ERROR", "name majburiy");

  const exists = await prisma.subject.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (exists) {
    throw new ApiError(409, "SUBJECT_EXISTS", "Bunday fan allaqachon mavjud");
  }

  const subject = await prisma.subject.create({ data: { name } });
  res.status(201).json({ ok: true, subject });
}

async function deleteSubject(req, res) {
  const { id } = req.params;
  const exists = await prisma.subject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new ApiError(404, "SUBJECT_NOT_FOUND", "Fan topilmadi");

  await prisma.subject.delete({ where: { id } });
  res.json({ ok: true });
}

module.exports = { getSubjects, createSubject, deleteSubject };
