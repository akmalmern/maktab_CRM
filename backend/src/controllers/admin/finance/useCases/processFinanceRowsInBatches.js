async function executeProcessFinanceRowsInBatches({
  deps,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  debtTargetMonth = null,
  batchSize = 500,
  onBatch,
}) {
  const { fetchFinancePageRows } = deps;
  const limit = Math.max(1, Number(batchSize || 500));
  let page = 1;
  let total = 0;
  let processed = 0;

  while (true) {
    const result = await fetchFinancePageRows({
      search,
      classroomId,
      classroomIds,
      status,
      debtMonth,
      debtTargetMonth,
      page,
      limit,
    });
    total = result.total;
    if (typeof onBatch === "function" && result.items.length) {
      await onBatch(result.items, { page, total });
    }
    processed += result.items.length;
    if (processed >= total || !result.items.length) break;
    page += 1;
  }

  return {
    total,
    processed,
    pages: page,
  };
}

module.exports = {
  executeProcessFinanceRowsInBatches,
};
