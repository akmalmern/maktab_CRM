const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(text)) return true;
  if (["0", "false", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL majburiy"),
  JWT_ACCESS_SECRET: z.string().min(24, "JWT_ACCESS_SECRET juda qisqa"),
  JWT_REFRESH_SECRET: z.string().min(24, "JWT_REFRESH_SECRET juda qisqa"),
  ACCESS_EXPIRES: z.string().default("15m"),
  REFRESH_EXPIRES: z.string().default("7d"),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return 0;
    if (toBool(v, false)) return 1;
    return Number(v);
  }, z.coerce.number().int().min(0).max(10)).default(0),
  ENABLE_AUTO_CLASS_PROMOTION: z.preprocess((v) => toBool(v, false), z.boolean()).default(false),
  ENABLE_AUTO_PAYROLL: z.preprocess((v) => toBool(v, false), z.boolean()).default(false),
  AUTO_PAYROLL_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  AUTO_PAYROLL_AUTO_APPROVE: z.preprocess((v) => toBool(v, true), z.boolean()).default(true),
  AUTO_PAYROLL_AUTO_PAY: z.preprocess((v) => toBool(v, false), z.boolean()).default(false),
  AUTO_PAYROLL_PAYMENT_METHOD: z.enum(["CASH", "BANK", "CLICK", "PAYME"]).default("BANK"),
  ENABLE_AUTO_FINANCE: z.preprocess((v) => toBool(v, false), z.boolean()).default(false),
  AUTO_FINANCE_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),
  AUTO_FINANCE_SYNC_FUTURE_MONTHS: z.coerce.number().int().min(0).max(12).default(3),
  ENABLE_REFRESH_SESSION_CLEANUP: z.preprocess((v) => toBool(v, true), z.boolean()).default(true),
  REFRESH_SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(10080).default(360),
  REFRESH_SESSION_REVOKED_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  MANAGER_SCOPE_ENFORCED: z.preprocess((v) => toBool(v, true), z.boolean()).default(true),
  ALLOW_LEGACY_PLAIN_CREDENTIAL_RESPONSE: z.preprocess((v) => toBool(v, false), z.boolean()).default(false),
  RATE_LIMIT_STORE: z.enum(["auto", "memory", "db"]).default("auto"),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(10),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(12),
  REFRESH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(10),
  REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(5000).default(40),
  RATE_LIMIT_DB_CLEANUP_EVERY: z.coerce.number().int().min(1).max(100000).default(100),
  RATE_LIMIT_DB_RETENTION_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  MONITORING_TOKEN: z.string().min(16).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
  HTTP_ACCESS_LOGS: z.preprocess((v) => toBool(v, true), z.boolean()).default(true),
  SLOW_REQUEST_WARN_MS: z.coerce.number().int().min(0).max(60000).default(1500),
});

let cachedEnv = null;

function loadEnv() {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Environment konfiguratsiyasi noto'g'ri: ${details}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production") {
    const hasCors = Boolean(String(env.CORS_ORIGINS || "").trim());
    if (!hasCors) {
      throw new Error("Production holatda CORS_ORIGINS majburiy");
    }
  }

  cachedEnv = env;
  return env;
}

const env = loadEnv();

module.exports = {
  env,
  loadEnv,
};
