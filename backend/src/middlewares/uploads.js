const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { ApiError } = require("../utils/apiError");

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "docs");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".pdf", ".jpg", ".jpeg", ".png"].includes(ext) ? ext : "";
    const name = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${safeExt}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new ApiError(
        400,
        "FILE_TYPE_NOT_ALLOWED",
        "Faqat pdf/jpg/jpeg/png fayllar ruxsat etiladi",
      ),
      false,
    );
  }
  cb(null, true);
}

const uploadDoc = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function handleMulterErrors(err, _req, _res, next) {
  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    return next(
      new ApiError(400, "FILE_TOO_LARGE", "Fayl hajmi 10MB dan oshmasin"),
    );
  }

  return next(err);
}

module.exports = { uploadDoc, handleMulterErrors, UPLOAD_DIR };
