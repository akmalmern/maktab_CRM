const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  parseSanaOrToday,
  buildRangeByType,
  buildAllRanges,
} = require("../../utils/attendancePeriod");

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function calcFoiz(records) {
  if (!records.length) return 0;
  const present = records.filter(
    (r) => r.holat === "KELDI" || r.holat === "KECHIKDI",
  ).length;
  return Number(((present / records.length) * 100).toFixed(1));
}

function groupSessions(records) {
  const sessionMap = new Map();
  for (const row of records) {
    const sanaKey = row.sana.toISOString().slice(0, 10);
    const key = `${row.darsJadvaliId}__${sanaKey}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        darsJadvaliId: row.darsJadvaliId,
        sana: sanaKey,
        sinf: row.darsJadvali?.sinf
          ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
          : "-",
        fan: row.darsJadvali?.fan?.name || "-",
        oqituvchi: row.darsJadvali?.oqituvchi
          ? `${row.darsJadvali.oqituvchi.firstName} ${row.darsJadvali.oqituvchi.lastName}`
          : "-",
        holatlar: { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 },
        jami: 0,
      });
    }
    const session = sessionMap.get(key);
    session.jami += 1;
    session.holatlar[row.holat] += 1;
  }

  return [...sessionMap.values()].sort((a, b) => {
    if (a.sana === b.sana) return a.sinf.localeCompare(b.sinf, "uz");
    return a.sana < b.sana ? 1 : -1;
  });
}

function buildBaseWhere({ classroomId, studentId }) {
  return {
    ...(studentId ? { studentId } : {}),
    ...(classroomId ? { darsJadvali: { sinfId: classroomId } } : {}),
  };
}

async function fetchSelectedRecords(baseWhere, selectedRange) {
  return prisma.davomat.findMany({
    where: {
      ...baseWhere,
      sana: { gte: selectedRange.from, lt: selectedRange.to },
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      darsJadvali: {
        select: {
          id: true,
          sinf: { select: { id: true, name: true, academicYear: true } },
          fan: { select: { name: true } },
          oqituvchi: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

function createSimplePdf(textLines) {
  const lines = textLines.slice(0, 44);
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

async function getAttendanceReport(req, res) {
  const { sana, sanaStr } = parseSanaOrToday(req.query.sana);
  const { classroomId, studentId } = req.query;
  const selectedRange = buildRangeByType(req.query.periodType, sana);
  const ranges = buildAllRanges(sana);

  const baseWhere = buildBaseWhere({ classroomId, studentId });

  const [
    kunlikRecords,
    haftalikRecords,
    oylikRecords,
    choraklikRecords,
    yillikRecords,
    selectedRecords,
  ] = await Promise.all([
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.kunlik.from, lt: ranges.kunlik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.haftalik.from, lt: ranges.haftalik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.oylik.from, lt: ranges.oylik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.choraklik.from, lt: ranges.choraklik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.yillik.from, lt: ranges.yillik.to },
      },
      select: { holat: true },
    }),
    fetchSelectedRecords(baseWhere, selectedRange),
  ]);

  const tarix = groupSessions(selectedRecords);

  res.json({
    ok: true,
    sana: sanaStr,
    periodType: selectedRange.type,
    period: {
      from: toIsoDate(selectedRange.from),
      to: toIsoDate(new Date(selectedRange.to.getTime() - 1)),
    },
    foizlar: {
      kunlik: calcFoiz(kunlikRecords),
      haftalik: calcFoiz(haftalikRecords),
      oylik: calcFoiz(oylikRecords),
      choraklik: calcFoiz(choraklikRecords),
      yillik: calcFoiz(yillikRecords),
      tanlanganPeriod: calcFoiz(selectedRecords),
    },
    tarix,
    jami: {
      tanlanganPeriodDavomatYozuvlari: selectedRecords.length,
      tanlanganPeriodDarsSessiyalari: tarix.length,
    },
  });
}

async function exportAttendanceReportPdf(req, res) {
  const { sana } = parseSanaOrToday(req.query.sana);
  const { classroomId, studentId } = req.query;
  const selectedRange = buildRangeByType(req.query.periodType, sana);
  const baseWhere = buildBaseWhere({ classroomId, studentId });
  const selectedRecords = await fetchSelectedRecords(baseWhere, selectedRange);
  const tarix = groupSessions(selectedRecords);

  const lines = [
    "Maktab CRM - Davomat Hisoboti",
    `Period: ${selectedRange.type}`,
    `Oraliq: ${toIsoDate(selectedRange.from)} - ${toIsoDate(new Date(selectedRange.to.getTime() - 1))}`,
    `Jami yozuvlar: ${selectedRecords.length}`,
    `Jami dars sessiyalari: ${tarix.length}`,
    "",
    "Tarixdan namunaviy sessiyalar (max 12):",
    ...(tarix.length
      ? tarix
          .slice(0, 12)
          .map(
            (row, idx) =>
              `${idx + 1}. ${row.sana} | ${row.sinf} | ${row.fan} | K:${row.holatlar.KELDI || 0} Sabs:${
                row.holatlar.SABABSIZ || 0
              }`,
          )
      : ["- Sessiya topilmadi"]),
  ];

  const pdfBuffer = createSimplePdf(lines);
  const fileName = `davomat-hisobot-${selectedRange.type.toLowerCase()}-${toIsoDate(selectedRange.from)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
}

async function exportAttendanceReportXlsx(req, res) {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new ApiError(
      500,
      "XLSX_NOT_INSTALLED",
      "Excel export uchun 'xlsx' paketi o'rnatilmagan",
    );
  }

  const { sana } = parseSanaOrToday(req.query.sana);
  const { classroomId, studentId } = req.query;
  const selectedRange = buildRangeByType(req.query.periodType, sana);
  const baseWhere = buildBaseWhere({ classroomId, studentId });
  const selectedRecords = await fetchSelectedRecords(baseWhere, selectedRange);
  const tarix = groupSessions(selectedRecords);

  const tarixRows = tarix.map((row) => ({
    Sana: row.sana,
    Sinf: row.sinf,
    Fan: row.fan,
    Oqituvchi: row.oqituvchi,
    Keldi: row.holatlar?.KELDI || 0,
    Kechikdi: row.holatlar?.KECHIKDI || 0,
    Sababli: row.holatlar?.SABABLI || 0,
    Sababsiz: row.holatlar?.SABABSIZ || 0,
    Jami: row.jami || 0,
  }));

  const infoRows = [
    { Kalit: "Period", Qiymat: selectedRange.type },
    { Kalit: "Boshlanish", Qiymat: toIsoDate(selectedRange.from) },
    {
      Kalit: "Tugash",
      Qiymat: toIsoDate(new Date(selectedRange.to.getTime() - 1)),
    },
    { Kalit: "Jami yozuvlar", Qiymat: selectedRecords.length },
    { Kalit: "Jami sessiyalar", Qiymat: tarix.length },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(infoRows),
    "Hisobot",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(tarixRows),
    "DavomatTarixi",
  );

  const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `davomat-hisobot-${selectedRange.type.toLowerCase()}-${toIsoDate(selectedRange.from)}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(fileBuffer);
}

module.exports = {
  getAttendanceReport,
  exportAttendanceReportPdf,
  exportAttendanceReportXlsx,
};
