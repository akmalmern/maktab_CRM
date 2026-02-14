const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");
const {
  genUsernameBase,
  genUsernameUnique,
  genPassword,
} = require("../../utils/credentials");

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

async function createTeacher(req, res) {
  // ✅ req.body validate middleware’dan o‘tgan
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

module.exports = { createTeacher, createStudent };
