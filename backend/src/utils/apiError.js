class ApiError extends Error {
  constructor(statusCode, code, message, meta) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta || null;
  }
}
module.exports = { ApiError };
