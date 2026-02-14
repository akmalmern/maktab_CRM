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
