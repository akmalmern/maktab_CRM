const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { ApiError } = require("../utils/apiError");

const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : "";
    const name = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${safe}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) {
    return cb(
      new ApiError(
        400,
        "AVATAR_TYPE_NOT_ALLOWED",
        "Faqat jpg/png/webp rasm ruxsat",
      ),
      false,
    );
  }
  cb(null, true);
}

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

function handleMulterErrors(err, _req, _res, next) {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return next(
      new ApiError(400, "AVATAR_TOO_LARGE", "Avatar 3MB dan oshmasin"),
    );
  }
  next(err);
}

module.exports = { uploadAvatar, handleMulterErrors };
