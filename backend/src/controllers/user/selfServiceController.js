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

function buildActiveUserSelect() {
  return {
    id: true,
    username: true,
    phone: true,
    password: true,
    isActive: true,
  };
}

async function ensureMainOrganization(tx) {
  return tx.organization.upsert({
    where: { key: "MAIN" },
    update: {},
    create: {
      key: "MAIN",
      name: "Main organization",
    },
    select: { id: true },
  });
}

const managerSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  avatarPath: true,
  user: {
    select: buildActiveUserSelect(),
  },
};

const SELF_SERVICE_CONFIG = {
  ADMIN: {
    prismaModel: "admin",
    where: (userId) => ({ userId }),
    notFoundCode: "ADMIN_TOPILMADI",
    notFoundMessage: "Admin topilmadi",
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      avatarPath: true,
      user: {
        select: buildActiveUserSelect(),
      },
    },
    avatarData: (fileName, filePath) => ({
      avatarName: fileName,
      avatarPath: filePath,
    }),
    clearAvatarData: {
      avatarName: null,
      avatarPath: null,
    },
    mapProfile(record, user = record.user) {
      return {
        id: record.id,
        firstName: record.firstName,
        lastName: record.lastName,
        fullName: `${record.firstName} ${record.lastName}`.trim(),
        username: user?.username || "-",
        phone: user?.phone || "",
        avatarPath: record.avatarPath || null,
      };
    },
  },
  STUDENT: {
    prismaModel: "student",
    where: (userId) => ({ userId }),
    notFoundCode: "STUDENT_TOPILMADI",
    notFoundMessage: "Student topilmadi",
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      avatarPath: true,
      user: {
        select: buildActiveUserSelect(),
      },
    },
    avatarData: (fileName, filePath) => ({
      avatarName: fileName,
      avatarPath: filePath,
    }),
    clearAvatarData: {
      avatarName: null,
      avatarPath: null,
    },
    mapProfile(record, user = record.user) {
      return {
        id: record.id,
        firstName: record.firstName,
        lastName: record.lastName,
        fullName: `${record.firstName} ${record.lastName}`.trim(),
        username: user?.username || "-",
        phone: user?.phone || "",
        avatarPath: record.avatarPath || null,
      };
    },
  },
  MANAGER: {
    prismaModel: "employee",
    where: (userId) => ({
      userId,
      user: { is: { role: "MANAGER" } },
    }),
    notFoundCode: "MANAGER_TOPILMADI",
    notFoundMessage: "Manager topilmadi",
    select: managerSelect,
    async load(userId) {
      const existing = await prisma.employee.findFirst({
        where: {
          userId,
          user: { is: { role: "MANAGER" } },
        },
        select: managerSelect,
      });

      if (existing) return existing;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          ...buildActiveUserSelect(),
          role: true,
        },
      });

      if (!user || !user.isActive || user.role !== "MANAGER") {
        return null;
      }

      return prisma.$transaction(async (tx) => {
        const again = await tx.employee.findFirst({
          where: {
            userId,
            user: { is: { role: "MANAGER" } },
          },
          select: managerSelect,
        });
        if (again) return again;

        const organization = await ensureMainOrganization(tx);
        return tx.employee.create({
          data: {
            organizationId: organization.id,
            userId,
            kind: "MANAGER",
          },
          select: managerSelect,
        });
      });
    },
    avatarData: (fileName, filePath) => ({
      avatarName: fileName,
      avatarPath: filePath,
    }),
    clearAvatarData: {
      avatarName: null,
      avatarPath: null,
    },
    mapProfile(record, user = record.user) {
      const firstName = record.firstName || "";
      const lastName = record.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return {
        id: record.id,
        firstName,
        lastName,
        fullName: fullName || user?.username || "-",
        username: user?.username || "-",
        phone: user?.phone || "",
        avatarPath: record.avatarPath || null,
      };
    },
  },
};

async function getSelfScope(role, userId) {
  const config = SELF_SERVICE_CONFIG[role];
  if (!config) {
    throw new ApiError(400, "ROLE_NOT_SUPPORTED", "Ushbu rol uchun self-service mavjud emas");
  }

  const record = config.load
    ? await config.load(userId)
    : await prisma[config.prismaModel].findFirst({
        where: config.where(userId),
        select: config.select,
      });

  if (!record || !record.user?.isActive) {
    throw new ApiError(404, config.notFoundCode, config.notFoundMessage);
  }

  return { config, record };
}

function createSelfServiceHandlers(role) {
  return {
    async updateProfile(req, res) {
      const { config, record } = await getSelfScope(role, req.user.sub);
      const nextPhone = cleanOptional(req.body.phone);

      if (!nextPhone) {
        throw new ApiError(400, "VALIDATION_ERROR", "Telefon majburiy");
      }

      if (nextPhone !== record.user.phone) {
        const existingUser = await prisma.user.findFirst({
          where: {
            phone: nextPhone,
            NOT: { id: record.userId },
          },
          select: { id: true },
        });

        if (existingUser) {
          throw new ApiError(409, "PHONE_TAKEN", "Bu telefon raqam tizimda mavjud");
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: record.userId },
        data: { phone: nextPhone },
        select: { username: true, phone: true },
      });

      res.json({
        ok: true,
        message: "Profil yangilandi",
        profile: config.mapProfile(record, updatedUser),
      });
    },

    async changePassword(req, res) {
      const { record } = await getSelfScope(role, req.user.sub);
      const currentPassword = String(req.body.currentPassword || "");
      const newPassword = String(req.body.newPassword || "");

      if (currentPassword === newPassword) {
        throw new ApiError(400, "VALIDATION_ERROR", "Yangi parol eski paroldan farq qilishi kerak");
      }

      const currentPasswordOk = await bcrypt.compare(currentPassword, record.user.password);
      if (!currentPasswordOk) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Joriy parol noto'g'ri");
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const currentRefreshToken = req.cookies?.refreshToken || null;
      const currentRefreshHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: record.userId },
          data: { password: passwordHash },
        });

        await tx.refreshSession.updateMany({
          where: {
            userId: record.userId,
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
    },

    async uploadAvatar(req, res) {
      if (!req.file) {
        throw new ApiError(400, "NO_FILE", "Rasm yuborilmadi (form-data: file)");
      }

      const { config, record } = await getSelfScope(role, req.user.sub);
      const filePath = `/uploads/avatars/${req.file.filename}`;
      const fileName = req.file.originalname;

      const updated = await prisma[config.prismaModel].update({
        where: { id: record.id },
        data: config.avatarData(fileName, filePath),
        select: {
          id: true,
          avatarName: true,
          avatarPath: true,
        },
      });

      removeFileBestEffort(record.avatarPath);

      res.status(201).json({
        ok: true,
        message: typeof req.t === "function" ? req.t("messages.AVATAR_UPLOADED") : "Avatar yangilandi",
        avatar: updated,
      });
    },

    async deleteAvatar(req, res) {
      const { config, record } = await getSelfScope(role, req.user.sub);

      await prisma[config.prismaModel].update({
        where: { id: record.id },
        data: config.clearAvatarData,
      });

      removeFileBestEffort(record.avatarPath);

      res.json({
        ok: true,
        message: typeof req.t === "function" ? req.t("messages.AVATAR_DELETED") : "Avatar o'chirildi",
      });
    },
  };
}

module.exports = {
  createSelfServiceHandlers,
};
