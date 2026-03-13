const { getErrorCodeMeta, normalizeErrorCode } = require("./errorCatalog");

class ApiError extends Error {
  constructor(statusCode, code, message, meta) {
    super(message);
    this.statusCode = statusCode;
    this.code = normalizeErrorCode(code, statusCode);
    this.meta = meta || null;
    this.codeMeta = getErrorCodeMeta(this.code, statusCode);
  }
}
module.exports = { ApiError };
