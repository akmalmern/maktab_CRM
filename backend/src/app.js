const express = require("express");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const prisma = require("./prisma");
const { env } = require("./config/env");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const documentRoutes = require("./routes/adminDocRoutes");
const avatarRoutes = require("./routes/avatarRoutes");
const adminDetailRoutes = require("./routes/adminDetailRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const managerRoutes = require("./routes/managerRoutes");
const { buildCorsOptions } = require("./config/cors");
const { locale } = require("./middlewares/locale");
const { requestContext } = require("./middlewares/requestContext");
const { requireMonitoringAccess } = require("./middlewares/monitoring");
const { snapshotMetrics, renderPrometheusMetrics } = require("./services/observability/metricsService");

const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorhandler");

const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.use(requestContext);
app.use(helmet());
app.use(compression());
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(locale);

// Security: never expose sensitive documents via public static serving.
// Keep only avatars public; documents are served through protected API routes.
app.use(
  "/uploads/avatars",
  express.static(path.join(process.cwd(), "uploads", "avatars")),
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    status: "ok",
    uptimeSec: Number(process.uptime().toFixed(0)),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    res.json({
      ok: true,
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: "not_ready",
      error: error?.message || "Database unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/metrics", requireMonitoringAccess, (_req, res) => {
  res.json({
    ok: true,
    metrics: snapshotMetrics(),
  });
});

app.get("/metrics/prometheus", requireMonitoringAccess, (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(renderPrometheusMetrics());
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/admin/docs", documentRoutes);
app.use("/api/admin/avatars", avatarRoutes);
app.use("/api/admin/details", adminDetailRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
