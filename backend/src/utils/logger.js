const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function isTestRuntime() {
  return (
    process.argv.includes("--test") ||
    process.execArgv.includes("--test") ||
    Boolean(process.env.NODE_TEST_CONTEXT)
  );
}

function readLogLevel() {
  const fallback =
    process.env.NODE_ENV === "production"
      ? "info"
      : process.env.NODE_ENV === "test" || isTestRuntime()
        ? "error"
        : "debug";
  const raw = String(process.env.LOG_LEVEL || fallback)
    .trim()
    .toLowerCase();
  return LEVEL_PRIORITY[raw] ? raw : fallback;
}

function shouldLog(level) {
  const configured = LEVEL_PRIORITY[readLogLevel()] || LEVEL_PRIORITY.info;
  return (LEVEL_PRIORITY[level] || LEVEL_PRIORITY.info) >= configured;
}

function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name || "Error",
    message: error.message || String(error),
    code: error.code || null,
    statusCode: Number.isFinite(Number(error.statusCode)) ? Number(error.statusCode) : null,
    stack: error.stack || null,
  };
}

function sanitizeValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, seen));

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = sanitizeValue(nested, seen);
    }
    seen.delete(value);
    return output;
  }

  return value;
}

function writeRecord(level, record) {
  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function emit(level, message, context = {}) {
  if (!shouldLog(level)) return;
  writeRecord(level, {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitizeValue(context),
  });
}

function createLogger(baseContext = {}) {
  const context = sanitizeValue(baseContext);
  return {
    child(extraContext = {}) {
      return createLogger({
        ...context,
        ...sanitizeValue(extraContext),
      });
    },
    debug(message, extraContext = {}) {
      emit("debug", message, { ...context, ...sanitizeValue(extraContext) });
    },
    info(message, extraContext = {}) {
      emit("info", message, { ...context, ...sanitizeValue(extraContext) });
    },
    warn(message, extraContext = {}) {
      emit("warn", message, { ...context, ...sanitizeValue(extraContext) });
    },
    error(message, extraContext = {}) {
      emit("error", message, { ...context, ...sanitizeValue(extraContext) });
    },
  };
}

const logger = createLogger({
  service: "maktab-crm-backend",
  pid: process.pid,
});

module.exports = {
  logger,
  createLogger,
  serializeError,
};
