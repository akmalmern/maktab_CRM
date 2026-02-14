const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const documentRoutes = require("./routes/adminDocRoutes");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorhandler");

const app = express();

// ✅ agar frontend alohida bo‘lsa, originni o‘zingnikiga mosla
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// ✅ static uploads (MUHIM: "/uploads")
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/docs", documentRoutes);
// 404 + error
app.use(notFound);
app.use(errorHandler);

module.exports = app;
