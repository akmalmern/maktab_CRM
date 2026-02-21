const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

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

const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorhandler");

const app = express();

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(cookieParser());
app.use(locale);

// Security: never expose sensitive documents via public static serving.
// Keep only avatars public; documents are served through protected API routes.
app.use(
  "/uploads/avatars",
  express.static(path.join(process.cwd(), "uploads", "avatars")),
);

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
