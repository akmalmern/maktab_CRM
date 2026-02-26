const { z } = require("zod");

const monthKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const payrollRunIdParamSchema = z.object({
  runId: z.string().cuid("runId noto'g'ri"),
});

const payrollLineIdParamSchema = z.object({
  lineId: z.string().cuid("lineId noto'g'ri"),
});

const realLessonIdParamSchema = z.object({
  lessonId: z.string().cuid("lessonId noto'g'ri"),
});

const teacherRateIdParamSchema = z.object({
  rateId: z.string().cuid("rateId noto'g'ri"),
});

const subjectDefaultRateIdParamSchema = z.object({
  rateId: z.string().cuid("rateId noto'g'ri"),
});

const teacherRateBaseSchema = z.object({
  teacherId: z.string().cuid("teacherId noto'g'ri"),
  subjectId: z.string().cuid("subjectId noto'g'ri"),
  ratePerHour: z.coerce.number().positive("ratePerHour musbat bo'lishi kerak"),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  note: z.string().trim().max(300).optional(),
});

const createTeacherRateSchema = teacherRateBaseSchema
  .superRefine((value, ctx) => {
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "effectiveTo effectiveFrom dan katta bo'lishi kerak",
      });
    }
  });

const updateTeacherRateSchema = teacherRateBaseSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["root"],
      message: "Kamida bitta field yuboring",
    });
  }
  if (value.effectiveFrom && value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
    ctx.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "effectiveTo effectiveFrom dan katta bo'lishi kerak",
    });
  }
});

const listTeacherRatesQuerySchema = z.object({
  teacherId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
  activeOn: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const subjectDefaultRateBaseSchema = z.object({
  subjectId: z.string().cuid("subjectId noto'g'ri"),
  ratePerHour: z.coerce.number().positive("ratePerHour musbat bo'lishi kerak"),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  note: z.string().trim().max(300).optional(),
});

const createSubjectDefaultRateSchema = subjectDefaultRateBaseSchema
  .superRefine((value, ctx) => {
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "effectiveTo effectiveFrom dan katta bo'lishi kerak",
      });
    }
  });

const updateSubjectDefaultRateSchema = subjectDefaultRateBaseSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["root"],
      message: "Kamida bitta field yuboring",
    });
  }
  if (value.effectiveFrom && value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
    ctx.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "effectiveTo effectiveFrom dan katta bo'lishi kerak",
    });
  }
});

const listSubjectDefaultRatesQuerySchema = z.object({
  subjectId: z.string().cuid().optional(),
  activeOn: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createRealLessonSchema = z
  .object({
    teacherId: z.string().cuid("teacherId noto'g'ri"),
    subjectId: z.string().cuid("subjectId noto'g'ri"),
    classroomId: z.string().cuid("classroomId noto'g'ri"),
    darsJadvaliId: z.string().cuid("darsJadvaliId noto'g'ri").optional().nullable(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    status: z.enum(["DONE", "CANCELED", "REPLACED"]).optional().default("DONE"),
    replacedByTeacherId: z.string().cuid("replacedByTeacherId noto'g'ri").optional().nullable(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endAt <= value.startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "endAt startAt dan katta bo'lishi kerak",
      });
    }
    if (value.status === "REPLACED" && !value.replacedByTeacherId) {
      ctx.addIssue({
        code: "custom",
        path: ["replacedByTeacherId"],
        message: "REPLACED status uchun replacedByTeacherId majburiy",
      });
    }
    if (value.status !== "REPLACED" && value.replacedByTeacherId) {
      ctx.addIssue({
        code: "custom",
        path: ["replacedByTeacherId"],
        message: "replacedByTeacherId faqat REPLACED statusda yuboriladi",
      });
    }
  });

const updateRealLessonStatusSchema = z
  .object({
    status: z.enum(["DONE", "CANCELED", "REPLACED"]),
    replacedByTeacherId: z.string().cuid("replacedByTeacherId noto'g'ri").optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "REPLACED" && !value.replacedByTeacherId) {
      ctx.addIssue({
        code: "custom",
        path: ["replacedByTeacherId"],
        message: "REPLACED status uchun replacedByTeacherId majburiy",
      });
    }
    if (value.status !== "REPLACED" && value.replacedByTeacherId) {
      ctx.addIssue({
        code: "custom",
        path: ["replacedByTeacherId"],
        message: "replacedByTeacherId faqat REPLACED statusda yuboriladi",
      });
    }
  });

const listRealLessonsQuerySchema = z.object({
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
  teacherId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
  classroomId: z.string().cuid().optional(),
  status: z.enum(["DONE", "CANCELED", "REPLACED"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const generatePayrollRunSchema = z.object({
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak"),
});

const listPayrollRunsQuerySchema = z.object({
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
  status: z.enum(["DRAFT", "APPROVED", "PAID", "REVERSED"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const payrollRunLinesQuerySchema = z.object({
  teacherId: z.string().cuid().optional(),
  employeeId: z.string().cuid().optional(),
  type: z.enum(["LESSON", "BONUS", "PENALTY", "MANUAL"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const addPayrollAdjustmentSchema = z
  .object({
    teacherId: z.string().cuid("teacherId noto'g'ri").optional(),
    employeeId: z.string().cuid("employeeId noto'g'ri").optional(),
    type: z.enum(["BONUS", "PENALTY", "MANUAL"]),
    amount: z.coerce.number().positive("amount musbat bo'lishi kerak"),
    description: z.string().trim().min(3).max(500),
  })
  .refine((value) => Boolean(value.teacherId || value.employeeId), {
    message: "teacherId yoki employeeId kerak",
    path: ["teacherId"],
  });

const payPayrollRunSchema = z.object({
  paymentMethod: z.enum(["CASH", "BANK", "CLICK", "PAYME"]),
  paidAt: z.coerce.date().optional(),
  externalRef: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

const reversePayrollRunSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const teacherPayslipListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "APPROVED", "PAID", "REVERSED"]).optional(),
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
});

module.exports = {
  payrollRunIdParamSchema,
  payrollLineIdParamSchema,
  realLessonIdParamSchema,
  teacherRateIdParamSchema,
  subjectDefaultRateIdParamSchema,
  createTeacherRateSchema,
  updateTeacherRateSchema,
  listTeacherRatesQuerySchema,
  createSubjectDefaultRateSchema,
  updateSubjectDefaultRateSchema,
  listSubjectDefaultRatesQuerySchema,
  createRealLessonSchema,
  updateRealLessonStatusSchema,
  listRealLessonsQuerySchema,
  generatePayrollRunSchema,
  listPayrollRunsQuerySchema,
  payrollRunLinesQuerySchema,
  addPayrollAdjustmentSchema,
  payPayrollRunSchema,
  reversePayrollRunSchema,
  teacherPayslipListQuerySchema,
};
