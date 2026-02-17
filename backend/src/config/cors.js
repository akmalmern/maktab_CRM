function parseOrigins(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedOrigins() {
  const fromEnv = parseOrigins(process.env.CORS_ORIGINS);
  if (fromEnv.length > 0) return fromEnv;
  return ["http://localhost:5173", "http://127.0.0.1:5173"];
}

function buildCorsOptions() {
  const allowedOrigins = new Set(getAllowedOrigins());
  return {
    credentials: true,
    origin(origin, callback) {
      // Allow non-browser clients and same-origin server tools
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
  };
}

module.exports = { buildCorsOptions, parseOrigins, getAllowedOrigins };
