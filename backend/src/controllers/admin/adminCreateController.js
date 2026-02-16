// const prisma = require("../../prisma");
// const bcrypt = require("bcrypt");
// const { ApiError } = require("../../utils/apiError");
// const {
//   genUsernameBase,
//   genUsernameUnique,
//   genPassword,
// } = require("../../utils/credentials");

// async function pickFreeUsername(tx, base) {
//   for (let i = 0; i < 10; i++) {
//     const candidate = genUsernameUnique(base);
//     const exists = await tx.user.findUnique({ where: { username: candidate } });
//     if (!exists) return candidate;
//   }
//   return `${base}${Date.now().toString().slice(-6)}`;
// }

// function cleanOptional(value) {
//   if (value === undefined || value === null) return null;
//   const s = String(value).trim();
//   return s === "" ? null : s;
// }

// function toDateOrThrow(birthDate) {
//   const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
//   if (Number.isNaN(d.getTime())) {
//     throw new ApiError(
//       400,
//       "VALIDATION_ERROR",
//       "birthDate noto‘g‘ri. Format: YYYY-MM-DD (1997-09-21)",
//     );
//   }
//   return d;
// }

// async function createTeacher(req, res) {
//   // ✅ req.body validate middleware’dan o‘tgan
//   const {
//     firstName,
//     lastName,
//     birthDate,
//     phone,
//     specialization,
//     yashashManzili,
//   } = req.body;

//   const birth = toDateOrThrow(birthDate);

//   const phoneClean = cleanOptional(phone);
//   const specializationClean = cleanOptional(specialization);

//   const base = genUsernameBase(firstName);
//   const plainPassword = genPassword(firstName, birth);

//   const result = await prisma.$transaction(async (tx) => {
//     const username = await pickFreeUsername(tx, base);
//     const hash = await bcrypt.hash(plainPassword, 10);

//     const user = await tx.user.create({
//       data: {
//         role: "TEACHER",
//         username,
//         password: hash,
//         phone: phoneClean,
//       },
//     });

//     const teacher = await tx.teacher.create({
//       data: {
//         userId: user.id,
//         firstName,
//         lastName,
//         birthDate: birth,
//         yashashManzili,
//         specialization: specializationClean,
//       },
//     });

//     return { teacher, username, plainPassword };
//   });

//   res.status(201).json({
//     ok: true,
//     teacherId: result.teacher.id,
//     credentials: { username: result.username, password: result.plainPassword },
//   });
// }

// async function createStudent(req, res) {
//   const { firstName, lastName, birthDate, phone, parentPhone, yashashManzili } =
//     req.body;

//   const birth = toDateOrThrow(birthDate);

//   const phoneClean = cleanOptional(phone);
//   const parentPhoneClean = cleanOptional(parentPhone);

//   const base = genUsernameBase(firstName);
//   const plainPassword = genPassword(firstName, birth);

//   const result = await prisma.$transaction(async (tx) => {
//     const username = await pickFreeUsername(tx, base);
//     const hash = await bcrypt.hash(plainPassword, 10);

//     const user = await tx.user.create({
//       data: {
//         role: "STUDENT",
//         username,
//         password: hash,
//         phone: phoneClean,
//       },
//     });

//     const student = await tx.student.create({
//       data: {
//         userId: user.id,
//         firstName,
//         lastName,
//         birthDate: birth,
//         yashashManzili,
//         parentPhone: parentPhoneClean,
//       },
//     });

//     return { student, username, plainPassword };
//   });

//   res.status(201).json({
//     ok: true,
//     studentId: result.student.id,
//     credentials: { username: result.username, password: result.plainPassword },
//   });
// }

// module.exports = { createTeacher, createStudent };
const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");
const {
  genUsernameBase,
  genUsernameUnique,
  genPassword,
} = require("../../utils/credentials");

const path = require("path");
const fs = require("fs");

/* =========================
   Helpers
========================= */

async function pickFreeUsername(tx, base) {
  for (let i = 0; i < 10; i++) {
    const candidate = genUsernameUnique(base);
    const exists = await tx.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

function cleanOptional(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function toDateOrThrow(birthDate) {
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "birthDate noto‘g‘ri. Format: YYYY-MM-DD (1997-09-21)",
    );
  }
  return d;
}

function removeFileBestEffort(filePath) {
  if (!filePath) return;
  try {
    const abs = path.join(process.cwd(), filePath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {}
}

function parseIntSafe(v, def) {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function buildSearchWhere(search) {
  const s = cleanOptional(search);
  if (!s) return {};
  // name bo‘yicha qidiruv (case-insensitive)
  return {
    OR: [
      { firstName: { contains: s, mode: "insensitive" } },
      { lastName: { contains: s, mode: "insensitive" } },
    ],
  };
}

/* =========================
   CREATE
========================= */

async function createTeacher(req, res) {
  const {
    firstName,
    lastName,
    birthDate,
    phone,
    specialization,
    yashashManzili,
  } = req.body;

  const birth = toDateOrThrow(birthDate);

  const phoneClean = cleanOptional(phone);
  const specializationClean = cleanOptional(specialization);

  const base = genUsernameBase(firstName);
  const plainPassword = genPassword(firstName, birth);

  const result = await prisma.$transaction(async (tx) => {
    // ✅ phone unique bo‘lsa, oldindan tekshir
    if (phoneClean) {
      const existsByPhone = await tx.user.findUnique({
        where: { phone: phoneClean },
        select: { id: true },
      });
      if (existsByPhone) {
        throw new ApiError(
          409,
          "PHONE_TAKEN",
          "Bu telefon raqam tizimda mavjud",
        );
      }
    }

    const username = await pickFreeUsername(tx, base);
    const hash = await bcrypt.hash(plainPassword, 10);

    const user = await tx.user.create({
      data: {
        role: "TEACHER",
        username,
        password: hash,
        phone: phoneClean,
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        birthDate: birth,
        yashashManzili,
        specialization: specializationClean,
      },
    });

    return { teacher, username, plainPassword };
  });

  res.status(201).json({
    ok: true,
    teacherId: result.teacher.id,
    credentials: { username: result.username, password: result.plainPassword },
  });
}

async function createStudent(req, res) {
  const { firstName, lastName, birthDate, phone, parentPhone, yashashManzili } =
    req.body;

  const birth = toDateOrThrow(birthDate);

  const phoneClean = cleanOptional(phone);
  const parentPhoneClean = cleanOptional(parentPhone);

  const base = genUsernameBase(firstName);
  const plainPassword = genPassword(firstName, birth);

  const result = await prisma.$transaction(async (tx) => {
    if (phoneClean) {
      const existsByPhone = await tx.user.findUnique({
        where: { phone: phoneClean },
        select: { id: true },
      });
      if (existsByPhone) {
        throw new ApiError(
          409,
          "PHONE_TAKEN",
          "Bu telefon raqam tizimda mavjud",
        );
      }
    }

    const username = await pickFreeUsername(tx, base);
    const hash = await bcrypt.hash(plainPassword, 10);

    const user = await tx.user.create({
      data: {
        role: "STUDENT",
        username,
        password: hash,
        phone: phoneClean,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        birthDate: birth,
        yashashManzili,
        parentPhone: parentPhoneClean,
      },
    });

    return { student, username, plainPassword };
  });

  res.status(201).json({
    ok: true,
    studentId: result.student.id,
    credentials: { username: result.username, password: result.plainPassword },
  });
}

/* =========================
   LIST (pagination + search)
   GET /api/admin/teachers?search=&page=1&limit=20
   GET /api/admin/students?search=&page=1&limit=20
========================= */

async function getTeachers(req, res) {
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const where = buildSearchWhere(req.query.search);

  const [items, total] = await prisma.$transaction([
    prisma.teacher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            phone: true,
            isActive: true,
          },
        },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    teachers: items,
  });
}

async function getStudents(req, res) {
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const where = buildSearchWhere(req.query.search);

  const [items, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            phone: true,
            isActive: true,
          },
        },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    students: items,
  });
}

/* =========================
   DELETE (DB + DISK)
   DELETE /api/admin/teachers/:id
   DELETE /api/admin/students/:id
========================= */

async function deleteTeacher(req, res) {
  const { id } = req.params; // Teacher.id

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      avatarPath: true,
      documents: { select: { filePath: true } },
    },
  });

  if (!teacher)
    throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");

  // DB delete (student/doc rows cascade bo‘lishi mumkin, lekin user qolib ketmasin)
  await prisma.$transaction(async (tx) => {
    await tx.teacher.delete({ where: { id: teacher.id } });
    await tx.user.delete({ where: { id: teacher.userId } });
  });

  // Disk cleanup
  for (const d of teacher.documents) removeFileBestEffort(d.filePath);
  removeFileBestEffort(teacher.avatarPath);

  res.json({ ok: true });
}

async function deleteStudent(req, res) {
  const { id } = req.params; // Student.id

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      avatarPath: true,
      documents: { select: { filePath: true } },
    },
  });

  if (!student)
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");

  await prisma.$transaction(async (tx) => {
    await tx.student.delete({ where: { id: student.id } });
    await tx.user.delete({ where: { id: student.userId } });
  });

  for (const d of student.documents) removeFileBestEffort(d.filePath);
  removeFileBestEffort(student.avatarPath);

  res.json({ ok: true });
}

module.exports = {
  createTeacher,
  createStudent,
  getTeachers,
  getStudents,
  deleteTeacher,
  deleteStudent,
};
