const { Prisma } = require("@prisma/client");
const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { formatMonthKey } = require("../../services/financeDebtService");
const { syncStudentOyMajburiyatlar } = require("../../services/financeMajburiyatService");

const DEFAULT_OYLIK_SUMMA = 300000;

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatClassroomName(name, year) {
  if (!name || !year) return "-";
  return `${name} (${year})`;
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

async function getSettings() {
  const settings = await prisma.moliyaSozlama.findUnique({
    where: { key: "MAIN" },
  });
  return {
    oylikSumma: settings?.oylikSumma || DEFAULT_OYLIK_SUMMA,
  };
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

function buildDebtorsWhereSql({ search, classroomId }) {
  const clauses = [Prisma.sql`d."debtMonths" > 0`];
  const text = String(search || "").trim();

  if (text) {
    const term = `%${text}%`;
    clauses.push(
      Prisma.sql`(
        s."firstName" ILIKE ${term}
        OR s."lastName" ILIKE ${term}
        OR s."parentPhone" ILIKE ${term}
        OR u."username" ILIKE ${term}
      )`,
    );
  }

  if (classroomId) {
    clauses.push(Prisma.sql`ae."classroomId" = ${classroomId}`);
  }

  return Prisma.sql`WHERE ${Prisma.join(clauses, Prisma.sql` AND `)}`;
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
  const offset = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const classroomId = req.query.classroomId || null;

  const settings = await getSettings();
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const missingCurrentRows = await prisma.$queryRaw`
    SELECT s.id
    FROM "Student" s
    WHERE NOT EXISTS (
      SELECT 1
      FROM "StudentOyMajburiyat" m
      WHERE m."studentId" = s.id
        AND m.yil = ${currentYear}
        AND m.oy = ${currentMonth}
    )
    LIMIT 500
  `;
  if (missingCurrentRows.length) {
    await syncStudentOyMajburiyatlar({
      studentIds: missingCurrentRows.map((row) => row.id),
      oylikSumma: settings.oylikSumma,
      futureMonths: 0,
    });
  }

  const whereSql = buildDebtorsWhereSql({ search, classroomId });

  const rows = await prisma.$queryRaw`
    WITH active_enrollment AS (
      SELECT DISTINCT ON (e."studentId")
        e."studentId",
        e."classroomId"
      FROM "Enrollment" e
      WHERE e."isActive" = true
      ORDER BY e."studentId", e."createdAt" DESC
    ),
    debt AS (
      SELECT
        m."studentId",
        COUNT(*)::int AS "debtMonths",
        COALESCE(SUM(m."netSumma"), 0)::int AS "debtSum"
      FROM "StudentOyMajburiyat" m
      WHERE m.holat = 'BELGILANDI'
        AND m."netSumma" > 0
        AND (m.yil < ${currentYear} OR (m.yil = ${currentYear} AND m.oy <= ${currentMonth}))
      GROUP BY m."studentId"
    ),
    base AS (
      SELECT
        s.id,
        s."firstName",
        s."lastName",
        s."parentPhone",
        u.username,
        u.phone,
        c.name AS "classroomName",
        c."academicYear",
        d."debtMonths",
        d."debtSum"
      FROM "Student" s
      LEFT JOIN "User" u ON u.id = s."userId"
      LEFT JOIN active_enrollment ae ON ae."studentId" = s.id
      LEFT JOIN "Classroom" c ON c.id = ae."classroomId"
      LEFT JOIN debt d ON d."studentId" = s.id
      ${whereSql}
    )
    SELECT
      b.*,
      COUNT(*) OVER()::int AS "__total",
      COALESCE(SUM(b."debtSum") OVER(), 0)::int AS "__sum"
    FROM base b
    ORDER BY b."firstName" ASC, b."lastName" ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const total = Number(rows[0]?.__total || 0);
  const totalDebtAmount = Number(rows[0]?.__sum || 0);
  const pages = Math.ceil(total / limit);

  const studentIds = rows.map((r) => r.id);
  const notesMap = await fetchLatestNotesMap(studentIds);
  const debtMonthsMap = new Map();

  if (studentIds.length) {
    const debtMonths = await prisma.studentOyMajburiyat.findMany({
      where: {
        studentId: { in: studentIds },
        holat: "BELGILANDI",
        netSumma: { gt: 0 },
        OR: [
          { yil: { lt: currentYear } },
          { yil: currentYear, oy: { lte: currentMonth } },
        ],
      },
      select: { studentId: true, yil: true, oy: true },
      orderBy: [{ yil: "asc" }, { oy: "asc" }],
    });

    for (const row of debtMonths) {
      if (!debtMonthsMap.has(row.studentId)) debtMonthsMap.set(row.studentId, []);
      debtMonthsMap
        .get(row.studentId)
        .push(`${row.yil}-${String(row.oy).padStart(2, "0")}`);
    }
  }

  const items = rows.map((row) => {
    const monthKeys = debtMonthsMap.get(row.id) || [];
    return {
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      username: row.username || "-",
      phone: row.phone || "-",
      parentPhone: row.parentPhone || "-",
      classroom: formatClassroomName(row.classroomName, row.academicYear),
      qarzOylarSoni: Number(row.debtMonths || 0),
      qarzOylar: monthKeys,
      qarzOylarFormatted: monthKeys.map((key) => formatMonthKey(key)),
      jamiQarzSumma: Number(row.debtSum || 0),
      oxirgiIzoh: notesMap.get(row.id) || null,
    };
  });

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
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }
  await syncStudentOyMajburiyatlar({
    studentIds: [studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 0,
  });

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const debt = await prisma.studentOyMajburiyat.aggregate({
    where: {
      studentId,
      holat: "BELGILANDI",
      netSumma: { gt: 0 },
      OR: [
        { yil: { lt: currentYear } },
        { yil: currentYear, oy: { lte: currentMonth } },
      ],
    },
    _count: { _all: true },
    _sum: { netSumma: true },
  });

  if (Number(debt?._count?._all || 0) < 1) {
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
      qarzOylarSoni: Number(debt?._count?._all || 0),
      jamiQarzSumma: Number(debt?._sum?.netSumma || 0),
    },
  });
}

module.exports = {
  getManagerClassrooms,
  getDebtors,
  getDebtorNotes,
  createDebtorNote,
};
