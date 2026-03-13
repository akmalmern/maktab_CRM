const STATUS_SEVERITY = {
  400: "warn",
  401: "warn",
  403: "warn",
  404: "info",
  409: "warn",
  422: "warn",
  429: "warn",
  500: "error",
  503: "error",
};

function normalizeErrorCode(code, statusCode = 500) {
  const raw = String(code || "").trim();
  if (raw) {
    return raw
      .replace(/[^A-Za-z0-9_]+/g, "_")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  if (Number(statusCode) === 404) return "NOT_FOUND";
  if (Number(statusCode) === 401) return "UNAUTHORIZED";
  if (Number(statusCode) === 403) return "FORBIDDEN";
  if (Number(statusCode) === 429) return "RATE_LIMITED";
  return "INTERNAL_ERROR";
}

function inferCategory(code, statusCode) {
  if (code === "INTERNAL_ERROR") return "INTERNAL";
  if (code === "RATE_LIMITED" || code.endsWith("_RATE_LIMIT") || code.startsWith("RATE_LIMIT")) {
    return "RATE_LIMIT";
  }
  if (
    code === "UNAUTHORIZED"
    || code === "FORBIDDEN"
    || code.startsWith("TOKEN_")
    || code.startsWith("REFRESH_")
    || code.startsWith("CSRF_")
    || code === "INVALID_CREDENTIALS"
    || code === "USER_INVALID"
    || code === "ROLE_INVALID"
    || code.startsWith("MONITORING_")
  ) {
    return "AUTH";
  }
  if (code.startsWith("PRISMA_") || code === "UNIQUE_CONSTRAINT" || code === "FOREIGN_KEY_CONSTRAINT") {
    return "DATABASE";
  }
  if (
    code.startsWith("PAYROLL_")
    || code === "ADVANCE_NOT_FOUND"
    || code.startsWith("ADVANCE_")
    || code === "EMPLOYEE_NOT_FOUND"
    || code.startsWith("EMPLOYEE_")
    || code.startsWith("SUBJECT_RATE_")
    || code.startsWith("TEACHER_RATE_")
    || code === "PAYSLIP_NOT_FOUND"
  ) {
    return "PAYROLL";
  }
  if (
    code.startsWith("PAYMENT_")
    || code.startsWith("IMTIYOZ_")
    || code.startsWith("TARIF_")
    || code.startsWith("FINANCE_")
    || code === "STUDENT_NOT_DEBTOR"
  ) {
    return "FINANCE";
  }
  if (
    code.startsWith("DAVOMAT_")
    || code.startsWith("REAL_LESSON_")
    || code.startsWith("DARS_")
    || code.startsWith("VAQT_ORALIQ_")
    || code === "INVALID_LESSON_DURATION"
    || code === "NOTOGRI_VAQT_ORALIGI"
  ) {
    return "ATTENDANCE";
  }
  if (code.startsWith("FILE_") || code.startsWith("DOC_") || code.startsWith("AVATAR_") || code === "NO_FILE") {
    return "FILE";
  }
  if (
    code.endsWith("_NOT_FOUND")
    || code.endsWith("_TOPILMADI")
    || code === "NOT_FOUND"
  ) {
    return "NOT_FOUND";
  }
  if (
    code.endsWith("_EXISTS")
    || code.endsWith("_CONFLICT")
    || code.endsWith("_BAND")
    || code.endsWith("_LOCKED")
    || code.endsWith("_MAVJUD")
  ) {
    return "CONFLICT";
  }
  if (
    code.startsWith("INVALID_")
    || code.endsWith("_INVALID")
    || code.endsWith("_REQUIRED")
    || code.endsWith("_NOMOS")
    || code.endsWith("_NOTOGRI")
    || code === "VALIDATION_ERROR"
    || code === "YILLIK_MONTHS_INVALID"
    || code === "KELAJAK_SANA_MUMKIN_EMAS"
  ) {
    return "VALIDATION";
  }
  if ([401, 403].includes(Number(statusCode))) return "AUTH";
  if (Number(statusCode) >= 500) return "INTERNAL";
  if (Number(statusCode) === 404) return "NOT_FOUND";
  if (Number(statusCode) === 409) return "CONFLICT";
  if (Number(statusCode) === 422 || Number(statusCode) === 400) return "VALIDATION";
  return "APPLICATION";
}

function isRetryable(code, statusCode) {
  if (Number(statusCode) >= 500) return true;
  return [
    "RATE_LIMITED",
    "LOGIN_RATE_LIMIT",
    "REFRESH_RATE_LIMIT",
    "RATE_LIMIT_STORE_UNAVAILABLE",
  ].includes(code);
}

function getSeverity(statusCode) {
  if (Number(statusCode) >= 500) return "error";
  if (Number(statusCode) >= 400) return "warn";
  return STATUS_SEVERITY[Number(statusCode)] || "info";
}

function getErrorCodeMeta(code, statusCode = 500) {
  const normalizedCode = normalizeErrorCode(code, statusCode);
  return {
    code: normalizedCode,
    category: inferCategory(normalizedCode, statusCode),
    retryable: isRetryable(normalizedCode, statusCode),
    severity: getSeverity(statusCode),
  };
}

module.exports = {
  normalizeErrorCode,
  getErrorCodeMeta,
};
