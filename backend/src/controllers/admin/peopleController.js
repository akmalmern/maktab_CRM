const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");
const { genUsernameBase, genPassword } = require("../../utils/credentials");
const {
  pickFreeUsername,
  cleanOptional,
  toDateOrThrow,
  removeFileBestEffort,
  parseIntSafe,
  buildSearchWhere,
} = require("./helpers");
const {
  buildPaidMonthMap,
  buildImtiyozMonthMap,
  buildDebtInfo,
} = require("../../services/financeDebtService");

async function createTeacher(req, res) {
  const { firstName, lastName, birthDate, phone, subjectId, yashashManzili } =
    req.body;

  const birth = toDateOrThrow(birthDate);
  const phoneClean = cleanOptional(phone);
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

    const subject = await tx.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (!subject) {
      throw new ApiError(404, "SUBJECT_NOT_FOUND", "Tanlangan fan topilmadi");
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
        subjectId,
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
  const {
    firstName,
    lastName,
    birthDate,
    phone,
    parentPhone,
    yashashManzili,
    classroomId,
  } = req.body;

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

    const classroom = await tx.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, isArchived: true },
    });
    if (!classroom || classroom.isArchived) {
      throw new ApiError(
        404,
        "CLASSROOM_NOT_FOUND",
        "Tanlangan sinf topilmadi",
      );
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

    await tx.enrollment.create({
      data: { studentId: student.id, classroomId },
    });

    return { student, username, plainPassword };
  });

  res.status(201).json({
    ok: true,
    studentId: result.student.id,
    credentials: { username: result.username, password: result.plainPassword },
  });
}

async function getTeachers(req, res) {
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const filter = cleanOptional(req.query.filter);
  const sort = cleanOptional(req.query.sort) || "createdAt:desc";
  const where = buildSearchWhere(req.query.search);
  if (filter && filter !== "all") {
    where.subjectId = filter;
  }

  const [sortKey, sortDirRaw] = sort.split(":");
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";
  let orderBy = [{ createdAt: "desc" }];
  if (sortKey === "name") {
    orderBy = [{ firstName: sortDir }, { lastName: sortDir }];
  } else if (sortKey === "username") {
    orderBy = [{ user: { username: sortDir } }];
  } else if (sortKey === "subject") {
    orderBy = [{ subject: { name: sortDir } }];
  }

  const [items, total] = await prisma.$transaction([
    prisma.teacher.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        subject: { select: { id: true, name: true } },
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
  const filter = cleanOptional(req.query.filter);
  const sort = cleanOptional(req.query.sort) || "createdAt:desc";
  const where = buildSearchWhere(req.query.search);
  if (filter && filter !== "all") {
    where.enrollments = { some: { isActive: true, classroomId: filter } };
  }

  const [sortKey, sortDirRaw] = sort.split(":");
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";
  const include = {
    enrollments: {
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        classroom: {
          select: { id: true, name: true, academicYear: true },
        },
      },
    },
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
  };

  let items = [];
  let total = 0;

  if (sortKey === "classroom") {
    const allItems = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include,
    });
    allItems.sort((a, b) => {
      const aName = a.enrollments?.[0]?.classroom?.name || "";
      const bName = b.enrollments?.[0]?.classroom?.name || "";
      return aName.localeCompare(bName, "uz") * (sortDir === "desc" ? -1 : 1);
    });
    total = allItems.length;
    items = allItems.slice(skip, skip + limit);
  } else {
    let orderBy = [{ createdAt: "desc" }];
    if (sortKey === "name") {
      orderBy = [{ firstName: sortDir }, { lastName: sortDir }];
    } else if (sortKey === "username") {
      orderBy = [{ user: { username: sortDir } }];
    }

    [items, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include,
      }),
      prisma.student.count({ where }),
    ]);
  }

  const settings = await prisma.moliyaSozlama.findUnique({
    where: { key: "MAIN" },
  });
  const oylikSumma = settings?.oylikSumma || 300000;
  const today = new Date();
  const studentIds = items.map((row) => row.id);
  const qoplamalar = studentIds.length
    ? await prisma.tolovQoplama.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, yil: true, oy: true },
      })
    : [];
  const imtiyozlar = studentIds.length
    ? await prisma.tolovImtiyozi.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          turi: true,
          qiymat: true,
          boshlanishOy: true,
          oylarSoni: true,
          isActive: true,
          bekorQilinganAt: true,
          oylarSnapshot: true,
        },
      })
    : [];

  const paidMap = buildPaidMonthMap(qoplamalar);
  const imtiyozGrouped = new Map();
  for (const row of imtiyozlar) {
    if (!imtiyozGrouped.has(row.studentId))
      imtiyozGrouped.set(row.studentId, []);
    imtiyozGrouped.get(row.studentId).push(row);
  }

  for (const item of items) {
    const startDate = item.enrollments?.[0]?.startDate || item.createdAt;
    const paidSet = paidMap.get(item.id) || new Set();
    const imtiyozMonthMap = buildImtiyozMonthMap({
      imtiyozlar: imtiyozGrouped.get(item.id) || [],
      oylikSumma,
    });
    const debtInfo = buildDebtInfo({
      startDate,
      paidMonthSet: paidSet,
      oylikSumma,
      imtiyozMonthMap,
      now: today,
    });
    item.tolovHolati = debtInfo.holat;
    item.qarzOylarSoni = debtInfo.qarzOylarSoni;
    item.jamiQarzSumma = debtInfo.jamiQarzSumma;
    item.jamiOylarSoni = debtInfo.dueMonthsCount;
  }

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    students: items,
  });
}

async function deleteTeacher(req, res) {
  const { id } = req.params;

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

  await prisma.$transaction(async (tx) => {
    await tx.teacher.delete({ where: { id: teacher.id } });
    await tx.user.delete({ where: { id: teacher.userId } });
  });

  for (const d of teacher.documents) removeFileBestEffort(d.filePath);
  removeFileBestEffort(teacher.avatarPath);
  res.json({ ok: true });
}

async function deleteStudent(req, res) {
  const { id } = req.params;

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
