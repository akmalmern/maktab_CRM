const { ApiError } = require("../../utils/apiError");
const {
  getAdminAttendanceReportCore,
  getAdminAttendanceReportData,
} = require("../../services/attendance/attendanceService");
const { toIsoDate } = require("../../services/attendance/attendanceScope");
const { createPdfBuffer } = require("./finance/shared/pdf");

async function getAttendanceReport(req, res) {
  res.json(await getAdminAttendanceReportData(req.query));
}

async function exportAttendanceReportPdf(req, res) {
  const {
    selectedRange,
    selectedRecordsCount,
    tarix,
    foizlar,
    expected,
  } = await getAdminAttendanceReportCore(req.query, { includeAllHistory: true });

  const lines = [
    "Maktab CRM - Davomat Hisoboti",
    `Period: ${selectedRange.type}`,
    `Oraliq: ${toIsoDate(selectedRange.from)} - ${toIsoDate(new Date(selectedRange.to.getTime() - 1))}`,
    `Jami yozuvlar: ${selectedRecordsCount}`,
    `Jami dars sessiyalari: ${tarix.length}`,
    `Davomat foizi (belgilangan): ${foizlar?.tanlanganPeriod || 0}%`,
    `Davomat foizi (reja asosida): ${foizlar?.tanlanganPeriodByExpected || 0}%`,
    `Coverage (belgilangan/reja): ${foizlar?.coverage || 0}%`,
    `Belgilanmagan yozuvlar: ${expected?.unmarkedRecords || 0}`,
    "",
    "Tarixdan namunaviy sessiyalar (max 40):",
    ...(tarix.length
      ? tarix
          .slice(0, 40)
          .map(
            (row, idx) =>
              `${idx + 1}. ${row.sana} | ${row.sinf} | ${row.fan} | K:${row.holatlar.KELDI || 0} Sabs:${
                row.holatlar.SABABSIZ || 0
              }`,
          )
      : ["- Sessiya topilmadi"]),
  ];

  const pdfBuffer = await createPdfBuffer(lines);
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

  const {
    selectedRange,
    selectedRecordsCount,
    tarix,
    foizlar,
    expected,
    risk,
  } = await getAdminAttendanceReportCore(req.query, { includeAllHistory: true });

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
    { Kalit: "Jami yozuvlar", Qiymat: selectedRecordsCount },
    { Kalit: "Jami sessiyalar", Qiymat: tarix.length },
    { Kalit: "Davomat foizi (belgilangan)", Qiymat: `${foizlar?.tanlanganPeriod || 0}%` },
    { Kalit: "Davomat foizi (reja asosida)", Qiymat: `${foizlar?.tanlanganPeriodByExpected || 0}%` },
    { Kalit: "Coverage", Qiymat: `${foizlar?.coverage || 0}%` },
    { Kalit: "Rejadagi yozuvlar", Qiymat: expected?.records || 0 },
    { Kalit: "Belgilanmagan yozuvlar", Qiymat: expected?.unmarkedRecords || 0 },
  ];
  const riskRows = [
    ...(risk?.topSababsizStudents || []).map((row) => ({
      Turi: "Student",
      Nomi: row.fullName,
      Username: row.username || "",
      Soni: row.count,
    })),
    ...(risk?.topSababsizTeachers || []).map((row) => ({
      Turi: "Teacher",
      Nomi: row.fullName,
      Username: row.username || "",
      Soni: row.count,
    })),
    ...(risk?.topSababsizClassrooms || []).map((row) => ({
      Turi: "Classroom",
      Nomi: row.classroom,
      Username: "",
      Soni: row.count,
    })),
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
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(riskRows.length ? riskRows : [{ Turi: "-", Nomi: "-", Username: "", Soni: 0 }]),
    "RiskTop",
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
