const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const path = require("path");
const fs = require("fs");

function removeFileBestEffort(filePath) {
  if (!filePath) return;
  try {
    const abs = path.join(process.cwd(), filePath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {}
}

async function resolveProfile(tx, userId) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      admin: { select: { id: true, avatarPath: true } },
      teacher: { select: { id: true, avatarPath: true } },
      student: { select: { id: true, avatarPath: true } },
    },
  });

  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User topilmadi");

  if (user.role === "ADMIN") {
    if (!user.admin?.id)
      throw new ApiError(404, "PROFILE_NOT_FOUND", "Admin profili topilmadi");
    return {
      model: "admin",
      profileId: user.admin.id,
      oldAvatarPath: user.admin.avatarPath,
    };
  }

  if (user.role === "TEACHER") {
    if (!user.teacher?.id)
      throw new ApiError(404, "PROFILE_NOT_FOUND", "Teacher profili topilmadi");
    return {
      model: "teacher",
      profileId: user.teacher.id,
      oldAvatarPath: user.teacher.avatarPath,
    };
  }

  if (user.role === "STUDENT") {
    if (!user.student?.id)
      throw new ApiError(404, "PROFILE_NOT_FOUND", "Student profili topilmadi");
    return {
      model: "student",
      profileId: user.student.id,
      oldAvatarPath: user.student.avatarPath,
    };
  }

  throw new ApiError(400, "ROLE_INVALID", "Role noto‘g‘ri");
}

async function adminUploadAvatar(req, res) {
  // faqat admin
  if (req.user?.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Faqat ADMIN avatar qo‘sha oladi");
  }

  if (!req.file) {
    throw new ApiError(400, "NO_FILE", "Rasm yuborilmadi (form-data: file)");
  }

  const { userId } = req.body;
  if (!userId) throw new ApiError(400, "VALIDATION_ERROR", "userId majburiy");

  const filePath = `/uploads/avatars/${req.file.filename}`;
  const fileName = req.file.originalname;

  const result = await prisma.$transaction(async (tx) => {
    const { model, profileId, oldAvatarPath } = await resolveProfile(
      tx,
      userId,
    );

    // DB update
    const updated = await tx[model].update({
      where: { id: profileId },
      data: { avatarName: fileName, avatarPath: filePath },
      select: { id: true, avatarName: true, avatarPath: true },
    });

    return { updated, oldAvatarPath };
  });

  // eski faylni o‘chiramiz (transactiondan keyin)
  removeFileBestEffort(result.oldAvatarPath);

  res.status(201).json({
    ok: true,
    message: req.t("messages.AVATAR_UPLOADED"),
    avatar: result.updated,
  });
}

async function adminDeleteAvatar(req, res) {
  if (req.user?.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Faqat ADMIN avatar o‘chira oladi");
  }

  const { userId } = req.body;
  if (!userId) throw new ApiError(400, "VALIDATION_ERROR", "userId majburiy");

  const result = await prisma.$transaction(async (tx) => {
    const { model, profileId, oldAvatarPath } = await resolveProfile(
      tx,
      userId,
    );

    await tx[model].update({
      where: { id: profileId },
      data: { avatarName: null, avatarPath: null },
    });

    return { oldAvatarPath };
  });

  removeFileBestEffort(result.oldAvatarPath);

  res.json({ ok: true, message: req.t("messages.AVATAR_DELETED") });
}

module.exports = { adminUploadAvatar, adminDeleteAvatar };
