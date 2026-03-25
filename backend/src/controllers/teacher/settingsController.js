const bcrypt = require("bcrypt");
const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { hashToken } = require("../../utils/tokens");

function cleanOptional(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function removeFileBestEffort(filePath) {
  if (!filePath) return;
  try {
    const path = require("path");
    const fs = require("fs");
    const abs = path.join(process.cwd(), filePath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {}
}

async function getTeacherProfileScope(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      avatarPath: true,
      user: {
        select: {
          id: true,
          username: true,
          phone: true,
          password: true,
          isActive: true,
        },
      },
      subject: { select: { id: true, name: true } },
    },
  });

  if (!teacher || !teacher.user?.isActive) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  return teacher;
}

async function updateTeacherProfile(req, res) {
  const teacher = await getTeacherProfileScope(req.user.sub);
  const nextPhone = cleanOptional(req.body.phone);

  if (!nextPhone) {
    throw new ApiError(400, "VALIDATION_ERROR", "Telefon majburiy");
  }

  if (nextPhone !== teacher.user.phone) {
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: nextPhone,
        NOT: { id: teacher.userId },
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ApiError(409, "PHONE_TAKEN", "Bu telefon raqam tizimda mavjud");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: teacher.userId },
    data: { phone: nextPhone },
    select: { username: true, phone: true },
  });

  res.json({
    ok: true,
    message: "Profil yangilandi",
    profile: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      fullName: `${teacher.firstName} ${teacher.lastName}`.trim(),
      username: updatedUser.username,
      phone: updatedUser.phone,
      avatarPath: teacher.avatarPath || null,
      subject: teacher.subject || null,
    },
  });
}

async function changeTeacherPassword(req, res) {
  const teacher = await getTeacherProfileScope(req.user.sub);
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (currentPassword === newPassword) {
    throw new ApiError(400, "VALIDATION_ERROR", "Yangi parol eski paroldan farq qilishi kerak");
  }

  const currentPasswordOk = await bcrypt.compare(currentPassword, teacher.user.password);
  if (!currentPasswordOk) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Joriy parol noto'g'ri");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const currentRefreshToken = req.cookies?.refreshToken || null;
  const currentRefreshHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: teacher.userId },
      data: { password: passwordHash },
    });

    await tx.refreshSession.updateMany({
      where: {
        userId: teacher.userId,
        revokedAt: null,
        ...(currentRefreshHash ? { tokenHash: { not: currentRefreshHash } } : {}),
      },
      data: { revokedAt: now },
    });
  });

  res.json({
    ok: true,
    message: "Parol yangilandi",
  });
}

async function uploadTeacherAvatar(req, res) {
  if (!req.file) {
    throw new ApiError(400, "NO_FILE", "Rasm yuborilmadi (form-data: file)");
  }

  const teacher = await getTeacherProfileScope(req.user.sub);
  const filePath = `/uploads/avatars/${req.file.filename}`;
  const fileName = req.file.originalname;

  const updated = await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      avatarName: fileName,
      avatarPath: filePath,
    },
    select: {
      id: true,
      avatarName: true,
      avatarPath: true,
    },
  });

  removeFileBestEffort(teacher.avatarPath);

  res.status(201).json({
    ok: true,
    message: typeof req.t === "function" ? req.t("messages.AVATAR_UPLOADED") : "Avatar yangilandi",
    avatar: updated,
  });
}

async function deleteTeacherAvatar(req, res) {
  const teacher = await getTeacherProfileScope(req.user.sub);

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      avatarName: null,
      avatarPath: null,
    },
  });

  removeFileBestEffort(teacher.avatarPath);

  res.json({
    ok: true,
    message: typeof req.t === "function" ? req.t("messages.AVATAR_DELETED") : "Avatar o'chirildi",
  });
}

module.exports = {
  updateTeacherProfile,
  changeTeacherPassword,
  uploadTeacherAvatar,
  deleteTeacherAvatar,
};
