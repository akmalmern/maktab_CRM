async function executeExportDebtorsPdf({
  deps,
  search,
  classroomId,
  classroomIds = null,
  res,
}) {
  const { processFinanceRowsInBatches, createPdfBuffer } = deps;
  let PDFDocument = null;
  try {
    PDFDocument = require("pdfkit");
  } catch {
    PDFDocument = null;
  }

  const fileName = `moliya-qarzdorlar-${new Date().toISOString().slice(0, 10)}.pdf`;

  if (!PDFDocument) {
    const lines = [
      "Maktab CRM - Qarzdorlar ro'yxati",
      `Sana: ${new Date().toISOString().slice(0, 10)}`,
      "",
    ];
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
        for (const row of items) {
          rowCount += 1;
          lines.push(
            `${rowCount}. ${row.fullName} | ${row.classroom} | ${(row.qarzOylarFormatted || []).join(", ") || "-"}`,
          );
        }
      },
    });

    lines.splice(2, 0, `Jami qarzdorlar: ${rowCount}`);
    const pdfBuffer = await createPdfBuffer(lines);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
    return { rowCount, streamed: false };
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    info: { Title: "Maktab CRM - Qarzdorlar ro'yxati" },
  });
  let rowCount = 0;

  const completion = new Promise((resolve, reject) => {
    doc.on("error", reject);
    res.on("finish", resolve);
    res.on("error", reject);
  });

  doc.pipe(res);
  doc.fontSize(14).text("Maktab CRM - Qarzdorlar ro'yxati");
  doc.moveDown(0.2);
  doc.fontSize(10).text(`Sana: ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown(0.5);

  await processFinanceRowsInBatches({
    search,
    classroomId,
    classroomIds,
    status: "QARZDOR",
    debtMonth: "ALL",
    debtTargetMonth: null,
    batchSize: 500,
    onBatch: async (items) => {
      for (const row of items) {
        rowCount += 1;
        doc.fontSize(10).text(
          `${rowCount}. ${row.fullName} | ${row.classroom} | ${(row.qarzOylarFormatted || []).join(", ") || "-"}`,
          { width: 520 },
        );
      }
    },
  });

  doc.end();
  await completion;
  return { rowCount, streamed: true };
}

module.exports = {
  executeExportDebtorsPdf,
};
