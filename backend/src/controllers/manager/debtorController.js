const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  buildPaidMonthMap,
  buildImtiyozMonthMap,
  buildDebtInfo,
} = require("../../services/financeDebtService");

const DEFAULT_OYLIK_SUMMA = 300000;

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatClassroom(enrollment) {
  const classroom = enrollment?.classroom;
  if (!classroom) return "-";
  return `${classroom.name} (${classroom.academicYear})`;
}

function formatManagerName(managerUser) {
  if (!managerUser) return "-";
  const firstName = managerUser.admin?.firstName || "";
  const lastName = managerUser.admin?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || managerUser.username || "-";
}

function mapNoteRow(row) {
  return {
    id: row.id,
    studentId: row.studentId,
    izoh: row.izoh,
    promisedPayDate: row.promisedPayDate,
    createdAt: row.createdAt,
    manager: row.managerUser
      ? {
          id: row.managerUser.id,
          username: row.managerUser.username,
          fullName: formatManagerName(row.managerUser),
        }
      : null,
  };
}

function buildStudentsWhere({ search, classroomId }) {
  const where = {};
  const text = String(search || "").trim();

  if (text) {
    where.OR = [
      { firstName: { contains: text, mode: "insensitive" } },
      { lastName: { contains: text, mode: "insensitive" } },
      { parentPhone: { contains: text, mode: "insensitive" } },
      { user: { is: { username: { contains: text, mode: "insensitive" } } } },
    ];
  }

  if (classroomId) {
    where.enrollments = {
      some: {
        isActive: true,
        classroomId,
      },
    };
  }

  return where;
}

async function getSettings() {
  const settings = await prisma.moliyaSozlama.findUnique({
    where: { key: "MAIN" },
  });
  return {
    oylikSumma: settings?.oylikSumma || DEFAULT_OYLIK_SUMMA,
  };
}

async function getStudentDebtInfo(studentId, oylikSumma) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      createdAt: true,
      enrollments: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { startDate: true },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const qoplamalar = await prisma.tolovQoplama.findMany({
    where: { studentId },
    select: { studentId: true, yil: true, oy: true },
  });
  const imtiyozlar = await prisma.tolovImtiyozi.findMany({
    where: { studentId },
    select: {
      turi: true,
      qiymat: true,
      boshlanishOy: true,
      oylarSoni: true,
      isActive: true,
      bekorQilinganAt: true,
      oylarSnapshot: true,
    },
  });
  const paidSet = buildPaidMonthMap(qoplamalar).get(studentId) || new Set();
  const imtiyozMonthMap = buildImtiyozMonthMap({ imtiyozlar, oylikSumma });
  const debtInfo = buildDebtInfo({
    startDate: student.enrollments?.[0]?.startDate || student.createdAt,
    paidMonthSet: paidSet,
    oylikSumma,
    imtiyozMonthMap,
  });

  return debtInfo;
}

async function fetchLatestNotesMap(studentIds) {
  if (!studentIds.length) return new Map();

  const latestRows = await prisma.qarzdorIzoh.findMany({
    where: { studentId: { in: studentIds } },
    distinct: ["studentId"],
    orderBy: [{ studentId: "asc" }, { createdAt: "desc" }],
    include: {
      managerUser: {
        select: {
          id: true,
          username: true,
          admin: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const map = new Map();
  for (const row of latestRows) {
    map.set(row.studentId, mapNoteRow(row));
  }
  return map;
}

async function getManagerClassrooms(_req, res) {
  const classrooms = await prisma.classroom.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, academicYear: true },
    orderBy: [{ name: "asc" }, { academicYear: "desc" }],
  });

  res.json({
    ok: true,
    classrooms,
  });
}

async function getDebtors(req, res) {
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const classroomId = req.query.classroomId || null;
  const batchSize = 200;

  const where = buildStudentsWhere({ search, classroomId });
  const settings = await getSettings();
  let dbSkip = 0;
  let debtorIndex = 0;
  let total = 0;
  let totalDebtAmount = 0;
  const pageItems = [];
  const pageStart = skip;
  const pageEnd = skip + limit;

  while (true) {
    const students = await prisma.student.findMany({
      where,
      skip: dbSkip,
      take: batchSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parentPhone: true,
        createdAt: true,
        user: { select: { username: true, phone: true } },
        enrollments: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            startDate: true,
            classroom: { select: { id: true, name: true, academicYear: true } },
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    if (!students.length) break;
    dbSkip += students.length;

    const studentIds = students.map((row) => row.id);
    const [qoplamalar, imtiyozlar] = await Promise.all([
      prisma.tolovQoplama.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, yil: true, oy: true },
      }),
      prisma.tolovImtiyozi.findMany({
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
      }),
    ]);

    const paidMonthMap = buildPaidMonthMap(qoplamalar);
    const imtiyozGrouped = new Map();
    for (const row of imtiyozlar) {
      if (!imtiyozGrouped.has(row.studentId))
        imtiyozGrouped.set(row.studentId, []);
      imtiyozGrouped.get(row.studentId).push(row);
    }

    for (const student of students) {
      const startDate = student.enrollments?.[0]?.startDate || student.createdAt;
      const paidSet = paidMonthMap.get(student.id) || new Set();
      const debtInfo = buildDebtInfo({
        startDate,
        paidMonthSet: paidSet,
        oylikSumma: settings.oylikSumma,
        imtiyozMonthMap: buildImtiyozMonthMap({
          imtiyozlar: imtiyozGrouped.get(student.id) || [],
          oylikSumma: settings.oylikSumma,
        }),
      });

      if (debtInfo.qarzOylarSoni < 1) continue;

      total += 1;
      totalDebtAmount += Number(debtInfo.jamiQarzSumma || 0);
      if (debtorIndex >= pageStart && debtorIndex < pageEnd) {
        pageItems.push({
          id: student.id,
          fullName: `${student.firstName} ${student.lastName}`.trim(),
          username: student.user?.username || "-",
          phone: student.user?.phone || "-",
          parentPhone: student.parentPhone || "-",
          classroom: formatClassroom(student.enrollments?.[0]),
          qarzOylarSoni: debtInfo.qarzOylarSoni,
          qarzOylar: debtInfo.qarzOylar.map((m) => m.key),
          qarzOylarFormatted: debtInfo.qarzOylar.map((m) => m.label),
          jamiQarzSumma: debtInfo.jamiQarzSumma,
          oxirgiIzoh: null,
        });
      }
      debtorIndex += 1;
    }
  }

  const latestNoteMap = await fetchLatestNotesMap(pageItems.map((item) => item.id));
  const items = pageItems.map((item) => ({
    ...item,
    oxirgiIzoh: latestNoteMap.get(item.id) || null,
  }));
  const pages = Math.ceil(total / limit);

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages,
    summary: {
      totalDebtors: total,
      totalDebtAmount,
    },
    students: items,
  });
}

async function getDebtorNotes(req, res) {
  const { studentId } = req.params;
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 10), 100);
  const skip = (page - 1) * limit;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const [total, rows] = await prisma.$transaction([
    prisma.qarzdorIzoh.count({ where: { studentId } }),
    prisma.qarzdorIzoh.findMany({
      where: { studentId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        managerUser: {
          select: {
            id: true,
            username: true,
            admin: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    student: {
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
    },
    notes: rows.map(mapNoteRow),
  });
}

async function createDebtorNote(req, res) {
  const { studentId } = req.params;
  const settings = await getSettings();
  const debtInfo = await getStudentDebtInfo(studentId, settings.oylikSumma);

  if (debtInfo.qarzOylarSoni < 1) {
    throw new ApiError(
      409,
      "STUDENT_NOT_DEBTOR",
      "Faqat qarzdor studentga izoh yozish mumkin",
    );
  }

  const created = await prisma.qarzdorIzoh.create({
    data: {
      studentId,
      managerUserId: req.user.sub,
      izoh: req.body.izoh,
      promisedPayDate: req.body.promisedPayDate || null,
    },
    include: {
      managerUser: {
        select: {
          id: true,
          username: true,
          admin: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  res.status(201).json({
    ok: true,
    note: mapNoteRow(created),
    debt: {
      qarzOylarSoni: debtInfo.qarzOylarSoni,
      qarzOylar: debtInfo.qarzOylar.map((m) => m.key),
      qarzOylarFormatted: debtInfo.qarzOylar.map((m) => m.label),
      jamiQarzSumma: debtInfo.jamiQarzSumma,
    },
  });
}

module.exports = {
  getManagerClassrooms,
  getDebtors,
  getDebtorNotes,
  createDebtorNote,
};
