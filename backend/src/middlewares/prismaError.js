// const { Prisma } = require("@prisma/client");
// const { ApiError } = require("../utils/apiError");

// function mapPrismaError(err) {
//   if (err instanceof Prisma.PrismaClientKnownRequestError) {
//     if (err.code === "P2002") {
//       return new ApiError(
//         409,
//         "UNIQUE_CONSTRAINT",
//         "Bu qiymat allaqachon mavjud",
//         {
//           target: err.meta?.target,
//         },
//       );
//     }
//     if (err.code === "P2025")
//       return new ApiError(404, "NOT_FOUND", "Ma'lumot topilmadi");
//     if (err.code === "P2003")
//       return new ApiError(
//         409,
//         "FOREIGN_KEY_CONSTRAINT",
//         "Bog‘langan ma’lumot xatoligi",
//       );
//     return new ApiError(400, "PRISMA_ERROR", "Database xatoligi", {
//       prismaCode: err.code,
//     });
//   }

//   if (err.code === "P2002") {
//     const target = err.meta?.target; // masalan: ["firstName","lastName","birthDate"]

//     const targetStr = Array.isArray(target)
//       ? target.join(",")
//       : String(target || "");

//     // ✅ Student duplicate
//     if (
//       targetStr.includes("firstName") &&
//       targetStr.includes("lastName") &&
//       targetStr.includes("birthDate")
//     ) {
//       return new ApiError(
//         409,
//         "STUDENT_ALREADY_EXISTS",
//         "Bu user allaqachon qo‘shilgan",
//       );
//     }

//     return new ApiError(
//       409,
//       "UNIQUE_CONSTRAINT",
//       "Bu qiymat allaqachon mavjud",
//       { target },
//     );
//   }

//   if (err instanceof Prisma.PrismaClientValidationError) {
//     return new ApiError(
//       400,
//       "PRISMA_VALIDATION",
//       "So‘rov parametrlari noto‘g‘ri",
//     );
//   }

//   return null;
// }

// module.exports = { mapPrismaError };
const { Prisma } = require("@prisma/client");
const { ApiError } = require("../utils/apiError");

function normalizeTarget(target) {
  if (!target) return "";
  if (Array.isArray(target)) return target.join(",");
  return String(target);
}

function mapPrismaError(err) {
  // ✅ Prisma known request errors (unique, fk, not found, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (err.code === "P2002") {
      const target = err.meta?.target; // ["username"] yoki ["firstName","lastName","birthDate"]
      const targetStr = normalizeTarget(target);
      const targetLower = targetStr.toLowerCase();

      // ✅ Student duplicate (firstName+lastName+birthDate unique)
      if (
        targetStr.includes("firstName") &&
        targetStr.includes("lastName") &&
        targetStr.includes("birthDate")
      ) {
        return new ApiError(
          409,
          "STUDENT_ALREADY_EXISTS",
          "Bu student allaqachon qo‘shilgan",
          { target },
        );
      }

      // ✅ Username duplicate
      if (targetStr.includes("username")) {
        return new ApiError(409, "USERNAME_TAKEN", "Bu username band", {
          target,
        });
      }

      // ✅ Phone duplicate
      if (targetStr.includes("phone")) {
        return new ApiError(
          409,
          "PHONE_TAKEN",
          "Bu telefon raqam tizimda mavjud",
          { target },
        );
      }

      if (
        (targetLower.includes("tolovqoplama") &&
          (targetLower.includes("studentid") || targetLower.includes("tranzaksiyaid")) &&
          targetLower.includes("yil") &&
          targetLower.includes("oy")) ||
        ((targetStr.includes("studentId") || targetStr.includes("tranzaksiyaId")) &&
          targetStr.includes("yil") &&
          targetStr.includes("oy"))
      ) {
        return new ApiError(
          409,
          "PAYMENT_MONTH_CONFLICT",
          "Tanlangan oylar bo'yicha to'lov allaqachon mavjud. Sahifani yangilang.",
          { target },
        );
      }

      if (
        targetLower.includes("enrollment_studentid_active_unique") ||
        (targetStr.includes("studentId") && targetStr.includes("isActive"))
      ) {
        return new ApiError(
          409,
          "ACTIVE_ENROLLMENT_CONFLICT",
          "Student allaqachon boshqa sinfda aktiv holatda biriktirilgan",
          { target },
        );
      }

      if (targetStr.includes("payrollRunId") && targetStr.includes("realLessonId")) {
        return new ApiError(
          409,
          "PAYROLL_LESSON_DUPLICATE",
          "Bu dars ushbu payroll run ichida allaqachon mavjud",
          { target },
        );
      }

      if (
        (targetStr.includes("organizationId") && targetStr.includes("periodMonth")) ||
        targetLower.includes("ux_payroll_run_active_period")
      ) {
        return new ApiError(
          409,
          "PAYROLL_RUN_PERIOD_CONFLICT",
          "Bu oy uchun aktiv payroll run allaqachon mavjud",
          { target },
        );
      }

      // default unique
      return new ApiError(
        409,
        "UNIQUE_CONSTRAINT",
        "Bu qiymat allaqachon mavjud",
        { target },
      );
    }

    // P2025: Record not found
    if (err.code === "P2025") {
      return new ApiError(404, "NOT_FOUND", "Ma'lumot topilmadi");
    }

    // P2003: Foreign key constraint failed
    if (err.code === "P2003") {
      return new ApiError(
        409,
        "FOREIGN_KEY_CONSTRAINT",
        "Bog‘langan ma’lumot xatoligi",
        { field: err.meta?.field_name },
      );
    }

    // other prisma known errors
    return new ApiError(400, "PRISMA_ERROR", "Database xatoligi", {
      prismaCode: err.code,
    });
  }

  // ✅ Prisma validation errors (wrong query shape)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new ApiError(
      400,
      "PRISMA_VALIDATION",
      "So‘rov parametrlari noto‘g‘ri",
    );
  }

  return null;
}

module.exports = { mapPrismaError };
