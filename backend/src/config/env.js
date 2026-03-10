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
  MANAGER_SCOPE_ENFORCED: z.preprocess((v) => toBool(v, true), z.boolean()).default(true),
  ALLOW_LEGACY_PLAIN_CREDENTIAL_RESPONSE: z.preprocess((v) => toBool(v, false), z.boolean()).default(false),
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
