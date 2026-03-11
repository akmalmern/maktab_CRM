const { z } = require("zod");

const monthKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const payrollRunIdParamSchema = z.object({
  runId: z.string().cuid("runId noto'g'ri"),
});

const payrollLineIdParamSchema = z.object({
  lineId: z.string().cuid("lineId noto'g'ri"),
});

const payrollItemIdParamSchema = z.object({
  itemId: z.string().cuid("itemId noto'g'ri"),
});

const payrollEmployeeIdParamSchema = z.object({
  employeeId: z.string().cuid("employeeId noto'g'ri"),
});

const advancePaymentIdParamSchema = z.object({
  advanceId: z.string().cuid("advanceId noto'g'ri"),
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

const payrollEmployeeModeSchema = z.enum([
  "LESSON_BASED",
  "FIXED",
  "MIXED",
  "MANUAL_ONLY",
]);

const payrollEmploymentStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

const bodyBooleanSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

const listPayrollEmployeesQuerySchema = z.object({
  kind: z.enum(["TEACHER", "STAFF"]).optional(),
  payrollMode: payrollEmployeeModeSchema.optional(),
  employmentStatus: payrollEmploymentStatusSchema.optional(),
  isPayrollEligible: queryBooleanSchema.optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const updatePayrollEmployeeConfigSchema = z
  .object({
    payrollMode: payrollEmployeeModeSchema.optional(),
    fixedSalaryAmount: z
      .union([
        z
          .coerce
          .number()
          .min(0, "fixedSalaryAmount manfiy bo'lmasligi kerak")
          .max(999999999999, "fixedSalaryAmount juda katta"),
        z.null(),
      ])
      .optional(),
    isPayrollEligible: z.boolean().optional(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["root"],
        message: "Kamida bitta field yuboring",
      });
    }
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

const bulkUpdateRealLessonStatusSchema = z
  .object({
    lessonIds: z.array(z.string().cuid("lessonId noto'g'ri")).min(1).max(500),
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

const payrollAutomationHealthQuerySchema = z.object({
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
  includeDetails: queryBooleanSchema.optional(),
});

const payrollMonthlyReportQuerySchema = z.object({
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
  includeDetails: queryBooleanSchema.optional(),
});

const payrollAutomationRunSchema = z
  .object({
    periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
    generate: bodyBooleanSchema.optional(),
    autoApprove: bodyBooleanSchema.optional(),
    autoPay: bodyBooleanSchema.optional(),
    dryRun: bodyBooleanSchema.optional(),
    force: bodyBooleanSchema.optional(),
    paymentMethod: z.enum(["CASH", "BANK", "CLICK", "PAYME"]).optional(),
    paidAt: z.coerce.date().optional(),
    externalRef: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.autoPay === true && !value.paymentMethod) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "autoPay=true bo'lsa paymentMethod majburiy",
      });
    }
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
  type: z.enum(["LESSON", "FIXED_SALARY", "ADVANCE_DEDUCTION", "BONUS", "PENALTY", "MANUAL"]).optional(),
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

const payPayrollItemSchema = z.object({
  paymentMethod: z.enum(["CASH", "BANK", "CLICK", "PAYME"]),
  amount: z.coerce.number().positive("amount musbat bo'lishi kerak").optional(),
  paidAt: z.coerce.date().optional(),
  externalRef: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

const listAdvancePaymentsQuerySchema = z.object({
  periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
  teacherId: z.string().cuid().optional(),
  employeeId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createAdvancePaymentSchema = z
  .object({
    periodMonth: z.string().trim().regex(monthKeyRegex, "periodMonth formati YYYY-MM bo'lishi kerak").optional(),
    teacherId: z.string().cuid("teacherId noto'g'ri").optional(),
    employeeId: z.string().cuid("employeeId noto'g'ri").optional(),
    amount: z.coerce.number().positive("amount musbat bo'lishi kerak"),
    paidAt: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => Boolean(value.teacherId || value.employeeId), {
    message: "teacherId yoki employeeId kerak",
    path: ["teacherId"],
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
  payrollItemIdParamSchema,
  payrollEmployeeIdParamSchema,
  advancePaymentIdParamSchema,
  realLessonIdParamSchema,
  teacherRateIdParamSchema,
  subjectDefaultRateIdParamSchema,
  listPayrollEmployeesQuerySchema,
  updatePayrollEmployeeConfigSchema,
  createTeacherRateSchema,
  updateTeacherRateSchema,
  listTeacherRatesQuerySchema,
  createSubjectDefaultRateSchema,
  updateSubjectDefaultRateSchema,
  listSubjectDefaultRatesQuerySchema,
  createRealLessonSchema,
  updateRealLessonStatusSchema,
  bulkUpdateRealLessonStatusSchema,
  listRealLessonsQuerySchema,
  generatePayrollRunSchema,
  payrollAutomationHealthQuerySchema,
  payrollMonthlyReportQuerySchema,
  payrollAutomationRunSchema,
  listPayrollRunsQuerySchema,
  payrollRunLinesQuerySchema,
  addPayrollAdjustmentSchema,
  payPayrollRunSchema,
  payPayrollItemSchema,
  listAdvancePaymentsQuerySchema,
  createAdvancePaymentSchema,
  reversePayrollRunSchema,
  teacherPayslipListQuerySchema,
};
