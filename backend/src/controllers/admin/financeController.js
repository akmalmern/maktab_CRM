const { Prisma } = require("@prisma/client");
const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  formatMonthByParts,
  formatMonthKey,
  monthKeyFromDate,
  buildMonthRange,
  buildPaidMonthMap,
  buildDebtInfo,
} = require("../../services/financeDebtService");
const { resolvePaymentPlan } = require("../../services/financePaymentService");

const DEFAULT_OYLIK_SUMMA = 300000;
const DEFAULT_YILLIK_SUMMA = 3000000;

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function safeFormatMonthKey(value) {
  try {
    return formatMonthKey(value);
  } catch {
    return value;
  }
}

function mapStudentRowFromRaw(row, debtInfo) {
  const classroom =
    row.classroomName && row.academicYear
      ? `${row.classroomName} (${row.academicYear})`
      : "-";

  return {
    id: row.id,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    username: row.username || "-",
    phone: row.phone || "-",
    classroom,
    holat: debtInfo.holat,
    qarzOylarSoni: debtInfo.qarzOylarSoni,
    qarzOylar: debtInfo.qarzOylar.map((m) => m.key),
    qarzOylarFormatted: debtInfo.qarzOylar.map((m) => m.label),
    tolanganOylarSoni: debtInfo.tolanganOylarSoni,
    jamiQarzSumma: debtInfo.jamiQarzSumma,
  };
}

function buildWhereSql({ search, classroomId }) {
  const whereClauses = [];

  if (search) {
    const term = `%${search}%`;
    whereClauses.push(
      Prisma.sql`(
        s."firstName" ILIKE ${term}
        OR s."lastName" ILIKE ${term}
        OR u."username" ILIKE ${term}
      )`,
    );
  }

  if (classroomId) {
    whereClauses.push(Prisma.sql`ae."classroomId" = ${classroomId}`);
  }

  if (!whereClauses.length) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`;
}

function buildStatusSql(status) {
  if (status === "QARZDOR") return Prisma.sql`WHERE "debtMonths" > 0`;
  if (status === "TOLAGAN") return Prisma.sql`WHERE "debtMonths" = 0`;
  return Prisma.empty;
}

async function fetchFinancePageRows({ search, classroomId, status, page, limit, settings }) {
  const whereSql = buildWhereSql({ search, classroomId });
  const statusSql = buildStatusSql(status);
  const offset = (page - 1) * limit;

  const rawRows = await prisma.$queryRaw`
    WITH active_enrollment AS (
      SELECT DISTINCT ON (e."studentId")
        e."studentId",
        e."startDate",
        e."classroomId"
      FROM "Enrollment" e
      WHERE e."isActive" = true
      ORDER BY e."studentId", e."createdAt" DESC
    ),
    base AS (
      SELECT
        s.id,
        s."firstName",
        s."lastName",
        s."createdAt",
        u.username,
        u.phone,
        ae."startDate",
        ae."classroomId",
        c.name AS "classroomName",
        c."academicYear",
        COALESCE(pm."paidMonths", 0)::int AS "paidMonths"
      FROM "Student" s
      LEFT JOIN "User" u ON u.id = s."userId"
      LEFT JOIN active_enrollment ae ON ae."studentId" = s.id
      LEFT JOIN "Classroom" c ON c.id = ae."classroomId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS "paidMonths"
        FROM "TolovQoplama" tq
        WHERE tq."studentId" = s.id
          AND make_date(tq.yil, tq.oy, 1) BETWEEN date_trunc('month', COALESCE(ae."startDate", s."createdAt"))::date
          AND date_trunc('month', CURRENT_DATE)::date
      ) pm ON true
      ${whereSql}
    ),
    calc AS (
      SELECT
        *,
        GREATEST(
          (
            (DATE_PART('year', age(date_trunc('month', CURRENT_DATE), date_trunc('month', COALESCE("startDate", "createdAt")))) * 12)
            + DATE_PART('month', age(date_trunc('month', CURRENT_DATE), date_trunc('month', COALESCE("startDate", "createdAt"))))
            + 1
          )::int,
          0
        ) AS "dueMonths"
      FROM base
    ),
    filtered AS (
      SELECT
        *,
        GREATEST("dueMonths" - "paidMonths", 0) AS "debtMonths"
      FROM calc
    ),
    status_filtered AS (
      SELECT *
      FROM filtered
      ${statusSql}
    )
    SELECT
      id,
      "firstName",
      "lastName",
      username,
      phone,
      "classroomName",
      "academicYear",
      COALESCE("startDate", "createdAt") AS "startDate",
      COUNT(*) OVER()::int AS "__total"
    FROM status_filtered
    ORDER BY "firstName" ASC, "lastName" ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const total = rawRows[0]?.__total || 0;
  const studentIds = rawRows.map((row) => row.id);
  const qoplamalar = studentIds.length
    ? await prisma.tolovQoplama.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, yil: true, oy: true },
      })
    : [];

  const paidMonthMap = buildPaidMonthMap(qoplamalar);
  const items = rawRows.map((row) => {
    const paidSet = paidMonthMap.get(row.id) || new Set();
    const debtInfo = buildDebtInfo({
      startDate: row.startDate,
      paidMonthSet: paidSet,
      oylikSumma: settings.oylikSumma,
    });
    return mapStudentRowFromRaw(row, debtInfo);
  });

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    items,
  };
}

async function fetchAllFinanceRows({ search, classroomId, status, settings }) {
  const limit = 500;
  let page = 1;
  let total = 0;
  const all = [];

  while (true) {
    const result = await fetchFinancePageRows({
      search,
      classroomId,
      status,
      page,
      limit,
      settings,
    });
    total = result.total;
    all.push(...result.items);
    if (all.length >= total || !result.items.length) break;
    page += 1;
  }

  return all;
}

function createSimplePdf(textLines) {
  const lines = textLines.slice(0, 46);
  const escapePdfText = (input) =>
    String(input)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const contentLines = ["BT", "/F1 11 Tf", "36 806 Td"];
  lines.forEach((line, idx) => {
    if (idx === 0) {
      contentLines.push(`(${escapePdfText(line)}) Tj`);
      return;
    }
    contentLines.push("0 -16 Td");
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });
  contentLines.push("ET");
  const contentStream = contentLines.join("\n");
  const contentLength = Buffer.byteLength(contentStream, "utf8");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

async function getOrCreateSettings() {
  return prisma.moliyaSozlama.upsert({
    where: { key: "MAIN" },
    update: {},
    create: {
      key: "MAIN",
      oylikSumma: DEFAULT_OYLIK_SUMMA,
      yillikSumma: DEFAULT_YILLIK_SUMMA,
    },
  });
}

async function getFinanceSettings(_req, res) {
  const settings = await getOrCreateSettings();
  res.json({ ok: true, settings });
}

async function upsertFinanceSettings(req, res) {
  const { oylikSumma, yillikSumma } = req.body;
  const settings = await prisma.moliyaSozlama.upsert({
    where: { key: "MAIN" },
    update: { oylikSumma, yillikSumma },
    create: { key: "MAIN", oylikSumma, yillikSumma },
  });
  res.json({ ok: true, settings });
}

async function getFinanceStudents(req, res) {
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const search = String(req.query.search || "").trim();
  const status = req.query.status || "ALL";
  const classroomId = req.query.classroomId || null;

  const settings = await getOrCreateSettings();
  const result = await fetchFinancePageRows({
    search,
    classroomId,
    status,
    page,
    limit,
    settings,
  });

  res.json({
    ok: true,
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
    settings: {
      oylikSumma: settings.oylikSumma,
      yillikSumma: settings.yillikSumma,
    },
    students: result.items,
  });
}

async function exportDebtorsXlsx(req, res) {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new ApiError(500, "XLSX_NOT_INSTALLED", "Excel export uchun 'xlsx' paketi o'rnatilmagan");
  }

  const search = String(req.query.search || "").trim();
  const classroomId = req.query.classroomId || null;
  const settings = await getOrCreateSettings();
  const rows = await fetchAllFinanceRows({ search, classroomId, status: "QARZDOR", settings });

  const exportRows = rows.map((row) => ({
    Oquvchi: row.fullName,
    Username: row.username,
    Sinf: row.classroom,
    QarzOylarSoni: row.qarzOylarSoni,
    QarzOylar: row.qarzOylarFormatted.join(", "),
    JamiQarzSom: row.jamiQarzSumma,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), "Qarzdorlar");
  const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const fileName = `moliya-qarzdorlar-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(fileBuffer);
}

async function exportDebtorsPdf(req, res) {
  const search = String(req.query.search || "").trim();
  const classroomId = req.query.classroomId || null;
  const settings = await getOrCreateSettings();
  const rows = await fetchAllFinanceRows({ search, classroomId, status: "QARZDOR", settings });
  const lines = [
    "Maktab CRM - Qarzdorlar ro'yxati",
    `Sana: ${new Date().toISOString().slice(0, 10)}`,
    `Jami qarzdorlar: ${rows.length}`,
    "",
    ...rows
      .slice(0, 35)
      .map(
        (row, idx) =>
          `${idx + 1}. ${row.fullName} | ${row.classroom} | ${row.qarzOylarFormatted.join(", ") || "-"}`,
      ),
  ];

  const pdfBuffer = createSimplePdf(lines);
  const fileName = `moliya-qarzdorlar-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
}

async function getStudentFinanceDetail(req, res) {
  const { studentId } = req.params;
  const settings = await getOrCreateSettings();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { username: true, phone: true } },
      enrollments: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { classroom: { select: { name: true, academicYear: true } } },
      },
    },
  });
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");

  const qoplamalar = await prisma.tolovQoplama.findMany({
    where: { studentId },
    select: { studentId: true, yil: true, oy: true },
  });
  const paidSet = buildPaidMonthMap(qoplamalar).get(studentId) || new Set();
  const debtInfo = buildDebtInfo({
    startDate: student.enrollments?.[0]?.startDate || student.createdAt,
    paidMonthSet: paidSet,
    oylikSumma: settings.oylikSumma,
  });

  const studentRow = mapStudentRowFromRaw(
    {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      username: student.user?.username,
      phone: student.user?.phone,
      classroomName: student.enrollments?.[0]?.classroom?.name,
      academicYear: student.enrollments?.[0]?.classroom?.academicYear,
    },
    debtInfo,
  );

  const transactions = await prisma.tolovTranzaksiya.findMany({
    where: { studentId },
    include: {
      qoplamalar: { select: { yil: true, oy: true }, orderBy: [{ yil: "desc" }, { oy: "desc" }] },
    },
    orderBy: { tolovSana: "desc" },
  });

  res.json({
    ok: true,
    student: studentRow,
    transactions: transactions.map((t) => {
      const activeMonths = t.qoplamalar.map((q) => `${q.yil}-${String(q.oy).padStart(2, "0")}`);
      const snapshotMonths = Array.isArray(t.qoplanganOylar) ? t.qoplanganOylar : [];
      const qoplanganOylar = activeMonths.length ? activeMonths : snapshotMonths;

      return {
        id: t.id,
        turi: t.turi,
        holat: t.holat,
        summa: t.summa,
        tolovSana: t.tolovSana,
        izoh: t.izoh || "",
        bekorSana: t.bekorSana,
        bekorIzoh: t.bekorIzoh || "",
        qoplanganOylar,
        qoplanganOylarFormatted: qoplanganOylar.map(safeFormatMonthKey),
      };
    }),
  });
}

async function createStudentPayment(req, res) {
  const { studentId } = req.params;
  const settings = await getOrCreateSettings();
  const startMonth = req.body.startMonth || monthKeyFromDate(new Date());
  const paymentPlan = resolvePaymentPlan({
    turi: req.body.turi,
    oylarSoniRaw: req.body.oylarSoni,
    summaRaw: req.body.summa,
    settings,
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, enrollments: { where: { isActive: true }, select: { id: true }, take: 1 } },
  });
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  if (!student.enrollments.length) {
    throw new ApiError(400, "ENROLLMENT_REQUIRED", "Student faol sinfga biriktirilmagan");
  }

  const months = buildMonthRange(startMonth, paymentPlan.oylarSoni);
  const existing = await prisma.tolovQoplama.findMany({
    where: {
      studentId,
      OR: months.map((m) => ({ yil: m.yil, oy: m.oy })),
    },
    select: { yil: true, oy: true },
  });

  const existingSet = new Set(existing.map((m) => `${m.yil}-${String(m.oy).padStart(2, "0")}`));
  const appliedMonths = months.filter(
    (m) => !existingSet.has(`${m.yil}-${String(m.oy).padStart(2, "0")}`),
  );
  const appliedMonthKeys = appliedMonths.map((m) => `${m.yil}-${String(m.oy).padStart(2, "0")}`);

  if (!appliedMonths.length) {
    throw new ApiError(
      409,
      "ALL_MONTHS_ALREADY_PAID",
      "Tanlangan oylar allaqachon to'langan",
    );
  }

  if (paymentPlan.oylarSoni !== appliedMonths.length) {
    throw new ApiError(
      409,
      "PAYMENT_MONTH_ALREADY_COVERED",
      "To'lov uchun tanlangan oylarning bir qismi oldin to'langan. Oylarni qayta tanlang.",
      {
        requestedMonths: paymentPlan.oylarSoni,
        availableMonths: appliedMonths.length,
      },
    );
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.tolovTranzaksiya.create({
      data: {
        studentId,
        adminUserId: req.user.sub,
        turi: req.body.turi,
        summa: paymentPlan.summa,
        izoh: req.body.izoh || null,
        qoplanganOylar: appliedMonthKeys,
      },
    });

    const inserted = await tx.tolovQoplama.createMany({
      data: appliedMonths.map((m) => ({
        studentId,
        tranzaksiyaId: created.id,
        yil: m.yil,
        oy: m.oy,
      })),
      skipDuplicates: true,
    });

    if (inserted.count !== appliedMonths.length) {
      throw new ApiError(
        409,
        "PAYMENT_MONTH_CONFLICT",
        "Tanlangan oylarning bir qismi boshqa to'lov bilan yopilgan. Sahifani yangilang va qayta urinib ko'ring.",
      );
    }

    return created;
  });

  res.status(201).json({
    ok: true,
    transactionId: transaction.id,
    appliedMonths: appliedMonthKeys,
    appliedMonthsFormatted: appliedMonthKeys.map(safeFormatMonthKey),
    summa: paymentPlan.summa,
    expectedSumma: paymentPlan.expectedSumma,
    oylarSoni: paymentPlan.oylarSoni,
    turi: req.body.turi,
  });
}

async function revertPayment(req, res) {
  const { tolovId } = req.params;
  const txn = await prisma.tolovTranzaksiya.findUnique({
    where: { id: tolovId },
    include: {
      qoplamalar: { select: { yil: true, oy: true } },
    },
  });

  if (!txn) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "To'lov topilmadi");
  }
  if (txn.holat === "BEKOR_QILINGAN") {
    throw new ApiError(409, "PAYMENT_ALREADY_REVERTED", "Bu to'lov allaqachon bekor qilingan");
  }

  const qoplamalardagiOylar = txn.qoplamalar.map(
    (q) => `${q.yil}-${String(q.oy).padStart(2, "0")}`,
  );
  const snapshotOylar = Array.isArray(txn.qoplanganOylar) ? txn.qoplanganOylar : [];
  const freedMonths = qoplamalardagiOylar.length ? qoplamalardagiOylar : snapshotOylar;

  await prisma.$transaction(async (tx) => {
    await tx.tolovQoplama.deleteMany({ where: { tranzaksiyaId: tolovId } });
    await tx.tolovTranzaksiya.update({
      where: { id: tolovId },
      data: {
        holat: "BEKOR_QILINGAN",
        bekorSana: new Date(),
        bekorQilganAdminUserId: req.user.sub,
      },
    });
  });

  res.json({
    ok: true,
    reverted: true,
    tolovId,
    freedMonths,
    freedMonthsFormatted: freedMonths.map(safeFormatMonthKey),
  });
}

module.exports = {
  getFinanceSettings,
  upsertFinanceSettings,
  getFinanceStudents,
  exportDebtorsXlsx,
  exportDebtorsPdf,
  getStudentFinanceDetail,
  createStudentPayment,
  revertPayment,
};
