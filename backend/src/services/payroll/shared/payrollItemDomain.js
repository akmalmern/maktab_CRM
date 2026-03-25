function createPayrollItemDomain({ ApiError, Prisma, decimal, money, DECIMAL_ZERO }) {
  async function getOrCreatePayrollItem(tx, { organizationId, payrollRunId, teacherId = null, employeeId = null }) {
    if (!teacherId && !employeeId) {
      throw new ApiError(400, "PAYROLL_ITEM_OWNER_REQUIRED", "Payroll item uchun teacherId yoki employeeId kerak");
    }

    let employee = null;
    let teacher = null;

    if (employeeId) {
      employee = await tx.employee.findFirst({
        where: { id: employeeId, organizationId },
        include: {
          user: { select: { username: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!employee) throw new ApiError(404, "EMPLOYEE_NOT_FOUND", "Xodim topilmadi");
      if (!teacherId && employee.teacher?.id) {
        teacherId = employee.teacher.id;
      }
    }

    if (teacherId) {
      teacher = await tx.teacher.findUnique({
        where: { id: teacherId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      });
      if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
    }

    if (employee?.teacher?.id && teacherId && employee.teacher.id !== teacherId) {
      throw new ApiError(
        409,
        "PAYROLL_ITEM_OWNER_MISMATCH",
        "employeeId va teacherId bir-biriga mos emas",
        { employeeId: employee.id, employeeTeacherId: employee.teacher.id, teacherId },
      );
    }

    let item = null;
    if (employeeId) {
      item = await tx.payrollItem.findUnique({
        where: { payrollRunId_employeeId: { payrollRunId, employeeId } },
        select: { id: true, teacherId: true, employeeId: true },
      });
    }
    if (!item && teacherId) {
      item = await tx.payrollItem.findUnique({
        where: { payrollRunId_teacherId: { payrollRunId, teacherId } },
        select: { id: true, teacherId: true, employeeId: true },
      });
    }
    if (item) {
      const patch = {};
      if (employeeId && item.employeeId !== employeeId) patch.employeeId = employeeId;
      if (teacherId && item.teacherId !== teacherId) patch.teacherId = teacherId;
      if (Object.keys(patch).length) {
        try {
          item = await tx.payrollItem.update({
            where: { id: item.id },
            data: patch,
            select: { id: true, teacherId: true, employeeId: true },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new ApiError(
              409,
              "PAYROLL_ITEM_OWNER_CONFLICT",
              "Payroll item owner update qilishda konflikt bo'ldi",
              { payrollRunId, teacherId, employeeId },
            );
          }
          throw error;
        }
      }
      return item;
    }

    const firstName = employee?.firstName || teacher?.firstName || null;
    const lastName = employee?.lastName || teacher?.lastName || null;
    const username = employee?.user?.username || teacher?.user?.username || null;

    try {
      item = await tx.payrollItem.create({
        data: {
          organizationId,
          payrollRunId,
          employeeId: employeeId || null,
          teacherId: teacherId || null,
          teacherFirstNameSnapshot: firstName,
          teacherLastNameSnapshot: lastName,
          teacherUsernameSnapshot: username,
        },
        select: { id: true, teacherId: true, employeeId: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(
          409,
          "PAYROLL_ITEM_OWNER_CONFLICT",
          "Payroll item create qilishda owner konflikti yuz berdi",
          { payrollRunId, teacherId, employeeId },
        );
      }
      throw error;
    }
    return item;
  }

  function buildItemSummaryFromLines(lines) {
    let totalMinutes = 0;
    let lessonLineCount = 0;
    let lineCount = 0;
    let grossAmount = DECIMAL_ZERO;
    let bonusAmount = DECIMAL_ZERO;
    let penaltyAmountSigned = DECIMAL_ZERO;
    let manualAmount = DECIMAL_ZERO;
    let fixedSalaryAmount = DECIMAL_ZERO;
    let advanceDeductionAmountSigned = DECIMAL_ZERO;

    for (const line of lines) {
      lineCount += 1;
      const amount = decimal(line.amount);
      if (line.type === "LESSON") {
        lessonLineCount += 1;
        totalMinutes += Number(line.minutes || 0);
        grossAmount = grossAmount.plus(amount);
      } else if (line.type === "FIXED_SALARY") {
        fixedSalaryAmount = fixedSalaryAmount.plus(amount);
        grossAmount = grossAmount.plus(amount);
      } else if (line.type === "ADVANCE_DEDUCTION") {
        advanceDeductionAmountSigned = advanceDeductionAmountSigned.plus(amount);
      } else if (line.type === "BONUS") {
        bonusAmount = bonusAmount.plus(amount);
      } else if (line.type === "PENALTY") {
        penaltyAmountSigned = penaltyAmountSigned.plus(amount);
      } else if (line.type === "MANUAL") {
        manualAmount = manualAmount.plus(amount);
      }
    }

    const penaltyAmount = penaltyAmountSigned.abs();
    const advanceDeductionAmount = advanceDeductionAmountSigned.abs();
    const adjustmentAmount = money(
      bonusAmount.plus(manualAmount).plus(penaltyAmountSigned).plus(advanceDeductionAmountSigned),
    );
    const rawPayableAmount = money(grossAmount.plus(adjustmentAmount));
    const payableAmount = rawPayableAmount.lte(DECIMAL_ZERO) ? DECIMAL_ZERO : rawPayableAmount;

    return {
      totalMinutes,
      totalHours: money(decimal(totalMinutes).div(60)),
      grossAmount: money(grossAmount),
      bonusAmount: money(bonusAmount),
      penaltyAmount: money(penaltyAmount),
      manualAmount: money(manualAmount),
      fixedSalaryAmount: money(fixedSalaryAmount),
      advanceDeductionAmount: money(advanceDeductionAmount),
      adjustmentAmount,
      payableAmount,
      lessonLineCount,
      lineCount,
    };
  }

  return {
    getOrCreatePayrollItem,
    buildItemSummaryFromLines,
  };
}

module.exports = {
  createPayrollItemDomain,
};
