const { z } = require("zod");

/**
 * ✅ PRO helperlar
 */

// "matn" majburiy: trim + min 1
const requiredText = (field) =>
  z
    .string({
      required_error: `${field} majburiy`,
      invalid_type_error: `${field} matn bo‘lishi kerak`,
    })
    .trim()
    .min(1, `${field} majburiy`);

// ixtiyoriy matn: "" / null / undefined => null
const optionalTextNull = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}, z.string().nullable());

// ✅ phone: ""/null/undefined => null, aks holda format tekshiradi
const phoneNull = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
  },
  z
    .string()
    .min(7, "Telefon juda qisqa")
    .max(30, "Telefon juda uzun")
    // oddiy, universal regex (raqamlar, +, bo‘sh joy, - , () )
    .regex(/^[+\d][\d\s\-()]+$/, "Telefon formati noto‘g‘ri")
    .nullable(),
);

// ✅ birthDate: "YYYY-MM-DD" => Date (controller’da new Date kerak emas)
const birthDateAsDate = z
  .string({
    required_error: "birthDate majburiy",
    invalid_type_error: "birthDate matn bo‘lishi kerak",
  })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate formati YYYY-MM-DD bo‘lishi kerak")
  .transform((value) => new Date(value))
  .refine((d) => !Number.isNaN(d.getTime()), "birthDate noto‘g‘ri sana");

// ✅ (ixtiyoriy) birthDate kelajakda bo‘lmasin
const birthDatePast = birthDateAsDate.refine(
  (d) => d.getTime() <= Date.now(),
  "birthDate kelajak sana bo‘lishi mumkin emas",
);

/**
 * ✅ Schemas
 * - .strict(): ortiqcha field yuborsa ham xato beradi (pro)
 */

const createTeacherSchema = z
  .object({
    firstName: requiredText("firstName"),
    lastName: requiredText("lastName"),
    birthDate: birthDatePast, // ✅ Date qaytadi
    yashashManzili: requiredText("yashashManzili"),

    phone: phoneNull,
    specialization: optionalTextNull,
  })
  .strict();

const createStudentSchema = z
  .object({
    firstName: requiredText("firstName"),
    lastName: requiredText("lastName"),
    birthDate: birthDatePast, // ✅ Date qaytadi
    yashashManzili: requiredText("yashashManzili"),

    phone: phoneNull,
    parentPhone: phoneNull,
  })
  .strict();

module.exports = { createTeacherSchema, createStudentSchema };
