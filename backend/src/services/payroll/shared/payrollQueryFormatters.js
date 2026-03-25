function csvEscape(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function toIsoOrEmpty(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

module.exports = {
  buildCsv,
  toIsoOrEmpty,
};
