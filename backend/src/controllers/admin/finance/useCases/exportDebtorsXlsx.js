async function executeExportDebtorsXlsx({
  deps,
  search,
  classroomId,
  classroomIds = null,
}) {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw deps.ApiError
      ? new deps.ApiError(
          500,
          "XLSX_NOT_INSTALLED",
          "Excel export uchun 'xlsx' paketi o'rnatilmagan",
        )
      : new Error("xlsx paketi topilmadi");
  }

  const { processFinanceRowsInBatches } = deps;
  const headers = [
    ["Oquvchi", "Username", "Sinf", "QarzOylarSoni", "QarzOylar", "JamiQarzSom"],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(headers);
  let rowCount = 0;

  await processFinanceRowsInBatches({
    search,
    classroomId,
    classroomIds,
    status: "QARZDOR",
    debtMonth: "ALL",
    debtTargetMonth: null,
    batchSize: 500,
    onBatch: async (items) => {
      const exportRows = items.map((row) => ({
        Oquvchi: row.fullName,
        Username: row.username,
        Sinf: row.classroom,
        QarzOylarSoni: row.qarzOylarSoni,
        QarzOylar: (row.qarzOylarFormatted || []).join(", "),
        JamiQarzSom: row.jamiQarzSumma,
      }));

      if (!exportRows.length) return;
      XLSX.utils.sheet_add_json(worksheet, exportRows, {
        skipHeader: true,
        origin: rowCount === 0 ? "A2" : -1,
      });
      rowCount += exportRows.length;
    },
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Qarzdorlar");

  return {
    rowCount,
    fileName: `moliya-qarzdorlar-${new Date().toISOString().slice(0, 10)}.xlsx`,
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  };
}

module.exports = {
  executeExportDebtorsXlsx,
};
