const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const documentRoutes = require("./routes/adminDocRoutes");
const avatarRoutes = require("./routes/avatarRoutes");
const adminDetailRoutes = require("./routes/adminDetailRoutes");
const { buildCorsOptions } = require("./config/cors");

const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorhandler");

const app = express();

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/docs", documentRoutes);
app.use("/api/avatars", avatarRoutes);
app.use("/api/admin-detail", adminDetailRoutes);
// Unified admin namespace (preferred)
app.use("/api/admin/docs", documentRoutes);
app.use("/api/admin/avatars", avatarRoutes);
app.use("/api/admin/details", adminDetailRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
