const prisma = require("../../prisma");
const { Prisma } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");
const { genUsernameBase, genPassword } = require("../../utils/credentials");
const {
  pickFreeUsername,
  cleanOptional,
  toDateOrThrow,
  parseIntSafe,
  buildSearchWhere,
} = require("./helpers");
const {
  buildPaidMonthAmountMap,
  buildImtiyozMonthMap,
  buildDebtInfo,
} = require("../../services/financeDebtService");

function buildArchivedUserIdentity(kind, userId) {
  const ts = Date.now();
  const suffix = String(userId || "").slice(-6) || "user";
  const token = `${ts}_${suffix}`;

  return {
    username: `archived_${kind}_${token}`,
    // DB CHECK constraint requires non-empty phone for TEACHER/STUDENT roles.
    // Keep a unique placeholder instead of null during soft-delete.
    phone: `archived_${kind}_${token}`,
  };
}

function buildUserActiveWhere(statusRaw) {
  const status = String(statusRaw || "active").toLowerCase();
  if (status === "archived") return { isActive: false };
  if (status === "all") return undefined;
  return { isActive: true };
}

function normalizePrismaTarget(err) {
  const target = err?.meta?.target;
  if (!target) return [];
  if (Array.isArray(target)) return target.map(String);
  return [String(target)];
}

function isPrismaKnownError(err, code) {
  return err instanceof Prisma.PrismaClientKnownRequestError && (!code || err.code === code);
}

function hasUniqueTarget(err, fieldName) {
  const target = normalizePrismaTarget(err).join(",").toLowerCase();
  return target.includes(String(fieldName || "").toLowerCase());
}

async function createUserWithRetry(tx, { role, base, hash, phone }) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const username = await pickFreeUsername(tx, base);
    try {
      const user = await tx.user.create({
        data: {
          role,
          username,
          password: hash,
          phone,
        },
      });
      return { user, username };
    } catch (err) {
      if (isPrismaKnownError(err, "P2002")) {
        if (hasUniqueTarget(err, "phone")) {
          throw new ApiError(409, "PHONE_TAKEN", "Bu telefon raqam tizimda mavjud");
        }
        if (hasUniqueTarget(err, "username")) {
          continue;
        }
      }
      throw err;
    }
  }

  throw new ApiError(409, "USERNAME_TAKEN", "Username band, qayta urinib ko'ring");
}

async function assertUniqueUserIdentity(tx, { userId = null, username = null, phone = null }) {
  if (username) {
    const exists = await tx.user.findFirst({
      where: {
        username,
        ...(userId ? { id: { not: userId } } : {}),
      },
      select: { id: true },
    });
    if (exists) {
      throw new ApiError(409, "USERNAME_TAKEN", "Bu username band");
    }
  }

  if (phone) {
    const exists = await tx.user.findFirst({
      where: {
        phone,
        ...(userId ? { id: { not: userId } } : {}),
      },
      select: { id: true },
    });
    if (exists) {
      throw new ApiError(409, "PHONE_TAKEN", "Bu telefon raqam tizimda mavjud");
    }
  }
}

function buildRestorePayload(body = {}) {
  return {
    newUsername: cleanOptional(body.newUsername),
    newPhone: cleanOptional(body.newPhone),
  };
}

function buildStudentEnrollmentInclude(statusRaw) {
  const status = String(statusRaw || "active").toLowerCase();
  const base = {
    take: 1,
    include: {
      classroom: {
        select: { id: true, name: true, academicYear: true },
      },
    },
  };

  if (status === "active") {
    return {
      ...base,
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    };
  }

  return {
    ...base,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  };
}

async function fetchStudentIdsSortedByClassroom({
  status = "active",
  search = null,
  filter = null,
  limit = 20,
  skip = 0,
  sortDir = "asc",
}) {
  const statusNorm = String(status || "active").toLowerCase();
  const safeSortDir = sortDir === "desc" ? "DESC" : "ASC";
  const searchValue = cleanOptional(search);
  const filterValue = cleanOptional(filter);

  const userStatusSql =
    statusNorm === "all"
      ? Prisma.empty
      : Prisma.sql` AND u."isActive" = ${statusNorm === "active"}`;

  const searchSql = searchValue
    ? Prisma.sql` AND (s."firstName" ILIKE ${`%${searchValue}%`} OR s."lastName" ILIKE ${`%${searchValue}%`})`
    : Prisma.empty;

  const classroomFilterSql =
    filterValue && filterValue !== "all"
      ? statusNorm === "active"
        ? Prisma.sql` AND EXISTS (
            SELECT 1 FROM "Enrollment" ef
            WHERE ef."studentId" = s."id" AND ef."classroomId" = ${filterValue} AND ef."isActive" = true
          )`
        : Prisma.sql` AND EXISTS (
            SELECT 1 FROM "Enrollment" ef
            WHERE ef."studentId" = s."id" AND ef."classroomId" = ${filterValue}
          )`
      : Prisma.empty;

  const lateralEnrollmentStatusSql =
    statusNorm === "active"
      ? Prisma.sql` AND e."isActive" = true`
      : Prisma.empty;

  const orderDirSql = Prisma.raw(safeSortDir);
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT s."id"
      FROM "Student" s
      INNER JOIN "User" u ON u."id" = s."userId"
      LEFT JOIN LATERAL (
        SELECT c."name" AS "classroomName", e."createdAt" AS "enrollmentCreatedAt"
        FROM "Enrollment" e
        INNER JOIN "Classroom" c ON c."id" = e."classroomId"
        WHERE e."studentId" = s."id"
        ${lateralEnrollmentStatusSql}
        ORDER BY e."isActive" DESC, e."createdAt" DESC
        LIMIT 1
      ) ce ON TRUE
      WHERE 1=1
      ${userStatusSql}
      ${searchSql}
      ${classroomFilterSql}
      ORDER BY COALESCE(ce."classroomName", '') ${orderDirSql}, s."firstName" ASC, s."lastName" ASC, s."id" ASC
      LIMIT ${limit} OFFSET ${skip}
    `,
  );

  const countRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM "Student" s
      INNER JOIN "User" u ON u."id" = s."userId"
      WHERE 1=1
      ${userStatusSql}
      ${searchSql}
      ${classroomFilterSql}
    `,
  );

  return {
    ids: (rows || []).map((row) => row.id).filter(Boolean),
    total: Number(countRows?.[0]?.count || 0),
  };
}

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

    const hash = await bcrypt.hash(plainPassword, 10);

    const { user, username: finalUsername } = await createUserWithRetry(tx, {
      role: "TEACHER",
      base,
      hash,
      phone: phoneClean,
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

    return { teacher, username: finalUsername, plainPassword };
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

    const hash = await bcrypt.hash(plainPassword, 10);

    const { user, username: finalUsername } = await createUserWithRetry(tx, {
      role: "STUDENT",
      base,
      hash,
      phone: phoneClean,
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

    return { student, username: finalUsername, plainPassword };
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
  const status = cleanOptional(req.query.status) || "active";
  const sort = cleanOptional(req.query.sort) || "createdAt:desc";
  const where = buildSearchWhere(req.query.search);
  const userWhere = buildUserActiveWhere(status);
  if (userWhere) where.user = userWhere;

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
  const status = cleanOptional(req.query.status) || "active";
  const sort = cleanOptional(req.query.sort) || "createdAt:desc";
  const where = buildSearchWhere(req.query.search);
  const userWhere = buildUserActiveWhere(status);
  if (userWhere) where.user = userWhere;

  if (filter && filter !== "all") {
    where.enrollments =
      status === "active"
        ? { some: { isActive: true, classroomId: filter } }
        : { some: { classroomId: filter } };
  }

  const [sortKey, sortDirRaw] = sort.split(":");
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";
  const include = {
    enrollments: buildStudentEnrollmentInclude(status),
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
    const sortedIds = await fetchStudentIdsSortedByClassroom({
      status,
      search: req.query.search,
      filter,
      limit,
      skip,
      sortDir,
    });
    total = sortedIds.total;
    if (sortedIds.ids.length) {
      const fetched = await prisma.student.findMany({
        where: { id: { in: sortedIds.ids } },
        include,
      });
      const orderMap = new Map(sortedIds.ids.map((studentId, index) => [studentId, index]));
      items = fetched.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    } else {
      items = [];
    }
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
          select: { studentId: true, yil: true, oy: true, summa: true },
        })
    : [];
  const imtiyozlar = studentIds.length
    ? await prisma.tolovImtiyozi.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          turi: true,
          qiymat: true,
          boshlanishYil: true,
          boshlanishOyRaqam: true,
          oylarSoni: true,
          isActive: true,
          bekorQilinganAt: true,
          oylarSnapshot: true,
        },
      })
    : [];

  const paidMap = buildPaidMonthAmountMap(qoplamalar);
  const imtiyozGrouped = new Map();
  for (const row of imtiyozlar) {
    if (!imtiyozGrouped.has(row.studentId))
      imtiyozGrouped.set(row.studentId, []);
    imtiyozGrouped.get(row.studentId).push(row);
  }

  for (const item of items) {
    const startDate = item.enrollments?.[0]?.startDate || item.createdAt;
    const paidMonthAmounts = paidMap.get(item.id) || new Map();
    const imtiyozMonthMap = buildImtiyozMonthMap({
      imtiyozlar: imtiyozGrouped.get(item.id) || [],
      oylikSumma,
    });
    const debtInfo = buildDebtInfo({
      startDate,
      paidMonthSet: paidMonthAmounts,
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
  const result = await prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { username: true, isActive: true } },
      },
    });
    if (!teacher) {
      throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
    }

    if (!teacher.user?.isActive) {
      return { archived: true, alreadyArchived: true };
    }

    const archivedIdentity = buildArchivedUserIdentity("teacher", teacher.userId);
    const updated = await tx.user.updateMany({
      where: { id: teacher.userId, isActive: true },
      data: {
        isActive: false,
        username: archivedIdentity.username,
        phone: archivedIdentity.phone,
        email: null,
      },
    });

    if (updated.count === 0) {
      const latestUser = await tx.user.findUnique({
        where: { id: teacher.userId },
        select: { isActive: true },
      });
      return { archived: !latestUser?.isActive, raceDetected: true };
    }

    return { archived: true };
  });

  res.json({ ok: true, ...result });
}

async function deleteStudent(req, res) {
  const { id } = req.params;
  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { username: true, isActive: true } },
      },
    });
    if (!student) {
      throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
    }

    if (!student.user?.isActive) {
      return { archived: true, alreadyArchived: true };
    }

    const archivedIdentity = buildArchivedUserIdentity("student", student.userId);

    await tx.enrollment.updateMany({
      where: { studentId: student.id, isActive: true },
      data: { isActive: false, endDate: new Date() },
    });

    const updated = await tx.user.updateMany({
      where: { id: student.userId, isActive: true },
      data: {
        isActive: false,
        username: archivedIdentity.username,
        phone: archivedIdentity.phone,
        email: null,
      },
    });

    if (updated.count === 0) {
      const latestUser = await tx.user.findUnique({
        where: { id: student.userId },
        select: { isActive: true },
      });
      return { archived: !latestUser?.isActive, raceDetected: true };
    }

    return { archived: true };
  });

  res.json({ ok: true, ...result });
}

async function restoreTeacher(req, res) {
  const { id } = req.params;
  const { newUsername, newPhone } = buildRestorePayload(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { username: true, phone: true, isActive: true } },
      },
    });
    if (!teacher) {
      throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
    }

    if (teacher.user?.isActive) {
      return { restored: true, alreadyActive: true, credentialsHint: { username: teacher.user?.username || null } };
    }

    if (newUsername || newPhone) {
      await assertUniqueUserIdentity(tx, {
        userId: teacher.userId,
        username: newUsername,
        phone: newPhone,
      });
    }

    const updated = await tx.user.updateMany({
      where: { id: teacher.userId, isActive: false },
      data: {
        isActive: true,
        ...(newUsername ? { username: newUsername } : {}),
        ...(newPhone ? { phone: newPhone } : {}),
      },
    });

    if (updated.count === 0) {
      const latestUser = await tx.user.findUnique({
        where: { id: teacher.userId },
        select: { isActive: true, username: true, phone: true },
      });
      return {
        restored: Boolean(latestUser?.isActive),
        raceDetected: true,
        alreadyActive: Boolean(latestUser?.isActive),
        credentialsHint: { username: latestUser?.username || null },
      };
    }

    const latestUser = await tx.user.findUnique({
      where: { id: teacher.userId },
      select: { username: true, phone: true },
    });
    const placeholderCreds = String(latestUser?.username || "").startsWith("archived_teacher_");
    return {
      restored: true,
      credentialsHint: { username: latestUser?.username || null },
      requiresCredentialUpdate: placeholderCreds,
    };
  });

  res.json({ ok: true, ...result });
}

async function restoreStudent(req, res) {
  const { id } = req.params;
  const { newUsername, newPhone } = buildRestorePayload(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { username: true, phone: true, isActive: true } },
      },
    });
    if (!student) {
      throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
    }

    if (student.user?.isActive) {
      return { restored: true, alreadyActive: true, credentialsHint: { username: student.user?.username || null } };
    }

    if (newUsername || newPhone) {
      await assertUniqueUserIdentity(tx, {
        userId: student.userId,
        username: newUsername,
        phone: newPhone,
      });
    }

    const updated = await tx.user.updateMany({
      where: { id: student.userId, isActive: false },
      data: {
        isActive: true,
        ...(newUsername ? { username: newUsername } : {}),
        ...(newPhone ? { phone: newPhone } : {}),
      },
    });

    let enrollmentRestored = false;
    let enrollmentRestoreReason = null;

    if (updated.count > 0) {
      const latestEnrollment = await tx.enrollment.findFirst({
        where: { studentId: student.id },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          isActive: true,
          classroom: {
            select: { id: true, isArchived: true },
          },
        },
      });

      if (latestEnrollment && !latestEnrollment.isActive) {
        const existingActive = await tx.enrollment.findFirst({
          where: { studentId: student.id, isActive: true },
          select: { id: true },
        });

        if (existingActive) {
          enrollmentRestoreReason = "ACTIVE_ENROLLMENT_ALREADY_EXISTS";
        } else if (latestEnrollment.classroom?.isArchived) {
          enrollmentRestoreReason = "LATEST_CLASSROOM_ARCHIVED";
        } else {
          await tx.enrollment.update({
            where: { id: latestEnrollment.id },
            data: { isActive: true, endDate: null },
          });
          enrollmentRestored = true;
        }
      } else if (latestEnrollment?.isActive) {
        enrollmentRestored = true;
      } else {
        enrollmentRestoreReason = "ENROLLMENT_NOT_FOUND";
      }
    } else {
      const latestUser = await tx.user.findUnique({
        where: { id: student.userId },
        select: { isActive: true, username: true },
      });
      return {
        restored: Boolean(latestUser?.isActive),
        raceDetected: true,
        alreadyActive: Boolean(latestUser?.isActive),
        credentialsHint: { username: latestUser?.username || null },
      };
    }

    const latestUser = await tx.user.findUnique({
      where: { id: student.userId },
      select: { username: true },
    });
    const placeholderCreds = String(latestUser?.username || "").startsWith("archived_student_");

    return {
      restored: true,
      credentialsHint: { username: latestUser?.username || null },
      requiresCredentialUpdate: placeholderCreds,
      enrollmentRestored,
      enrollmentRestoreReason,
    };
  });

  res.json({ ok: true, ...result });
}

module.exports = {
  createTeacher,
  createStudent,
  getTeachers,
  getStudents,
  deleteTeacher,
  deleteStudent,
  restoreTeacher,
  restoreStudent,
};
