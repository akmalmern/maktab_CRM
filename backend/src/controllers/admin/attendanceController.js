const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  getAdminAttendanceReportCore,
  getAdminAttendanceReportData,
} = require("../../services/attendance/attendanceService");
const { toIsoDate } = require("../../services/attendance/attendanceScope");

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
  res.json(await getAdminAttendanceReportData(req.query));
}

async function exportAttendanceReportPdf(req, res) {
  const { selectedRange, selectedRecords, tarix } = await getAdminAttendanceReportCore(
    req.query,
  );

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

  const { selectedRange, selectedRecords, tarix } = await getAdminAttendanceReportCore(
    req.query,
  );

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
