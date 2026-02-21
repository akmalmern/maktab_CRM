function mapTarifRow(row) {
  return {
    id: row.id,
    oylikSumma: row.oylikSumma,
    yillikSumma: row.yillikSumma,
    boshlanishSana: row.boshlanishSana,
    holat: row.holat,
    izoh: row.izoh || "",
    createdAt: row.createdAt,
    createdBy: row.yaratganAdminUser
      ? {
          id: row.yaratganAdminUser.id,
          username: row.yaratganAdminUser.username,
          fullName:
            `${row.yaratganAdminUser.admin?.firstName || ""} ${row.yaratganAdminUser.admin?.lastName || ""}`.trim() ||
            row.yaratganAdminUser.username,
        }
      : null,
  };
}

function mapTarifAuditRow(row) {
  return {
    id: row.id,
    action: row.action,
    oldValue: row.oldValue || null,
    newValue: row.newValue || null,
    izoh: row.izoh || "",
    createdAt: row.createdAt,
    tarifVersionId: row.tarifVersionId || null,
    performedBy: row.performedByUser
      ? {
          id: row.performedByUser.id,
          username: row.performedByUser.username,
          fullName:
            `${row.performedByUser.admin?.firstName || ""} ${row.performedByUser.admin?.lastName || ""}`.trim() ||
            row.performedByUser.username,
        }
      : null,
  };
}

module.exports = {
  mapTarifRow,
  mapTarifAuditRow,
};
