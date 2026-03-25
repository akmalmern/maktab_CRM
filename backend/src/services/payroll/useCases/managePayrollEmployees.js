function parsePagination(query, { defaultLimit, maxLimit }) {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : defaultLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function executeListPayrollEmployees({ deps, query }) {
  const {
    prisma,
    ensureMainOrganization,
    cleanOptional,
    mapPayrollEmployeeConfigRow,
  } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  const search = cleanOptional(query.search);

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = {
      organizationId: org.id,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.payrollMode ? { payrollMode: query.payrollMode } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.isPayrollEligible !== undefined
        ? { isPayrollEligible: query.isPayrollEligible }
        : {}),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        {
          user: {
            is: {
              username: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          teacher: {
            is: {
              firstName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          teacher: {
            is: {
              lastName: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      tx.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ kind: "asc" }, { firstName: "asc" }, { lastName: "asc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              isActive: true,
            },
          },
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              subject: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      tx.employee.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      employees: items.map(mapPayrollEmployeeConfigRow),
    };
  });
}

async function executeUpdatePayrollEmployeeConfig({
  deps,
  employeeId,
  body,
  actorUserId,
  req,
}) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    money,
    decimal,
    DECIMAL_ZERO,
    cleanOptional,
    createAuditLog,
    mapPayrollEmployeeConfigRow,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const before = await tx.employee.findFirst({
      where: { id: employeeId, organizationId: org.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!before) {
      throw new ApiError(404, "PAYROLL_EMPLOYEE_NOT_FOUND", "Payroll xodim topilmadi");
    }

    const nextPayrollMode = body.payrollMode ?? before.payrollMode;
    const nextFixedSalaryAmount =
      body.fixedSalaryAmount !== undefined
        ? body.fixedSalaryAmount === null
          ? null
          : money(body.fixedSalaryAmount)
        : before.fixedSalaryAmount;

    if (["FIXED", "MIXED"].includes(nextPayrollMode)) {
      const fixedSalary = nextFixedSalaryAmount === null ? DECIMAL_ZERO : decimal(nextFixedSalaryAmount);
      if (fixedSalary.lte(DECIMAL_ZERO)) {
        throw new ApiError(
          400,
          "PAYROLL_FIXED_SALARY_REQUIRED",
          "FIXED/MIXED rejim uchun oklad summasi musbat bo'lishi kerak",
        );
      }
    }

    const patch = {};
    if (body.payrollMode !== undefined) patch.payrollMode = body.payrollMode;
    if (body.fixedSalaryAmount !== undefined) {
      patch.fixedSalaryAmount = body.fixedSalaryAmount === null ? null : money(body.fixedSalaryAmount);
    }
    if (body.isPayrollEligible !== undefined) patch.isPayrollEligible = body.isPayrollEligible;
    if (body.note !== undefined) patch.note = cleanOptional(body.note) || null;

    if (Object.keys(patch).length === 0) {
      return { employee: mapPayrollEmployeeConfigRow(before) };
    }

    const updated = await tx.employee.update({
      where: { id: before.id },
      data: patch,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_EMPLOYEE_CONFIG_UPDATE",
      entityType: "EMPLOYEE",
      entityId: updated.id,
      before: {
        payrollMode: before.payrollMode,
        fixedSalaryAmount: before.fixedSalaryAmount === null ? null : String(before.fixedSalaryAmount),
        isPayrollEligible: before.isPayrollEligible,
        employmentStatus: before.employmentStatus,
        note: before.note || null,
      },
      after: {
        payrollMode: updated.payrollMode,
        fixedSalaryAmount: updated.fixedSalaryAmount === null ? null : String(updated.fixedSalaryAmount),
        isPayrollEligible: updated.isPayrollEligible,
        employmentStatus: updated.employmentStatus,
        note: updated.note || null,
      },
      req,
    });

    return {
      employee: mapPayrollEmployeeConfigRow(updated),
    };
  });
}

module.exports = {
  executeListPayrollEmployees,
  executeUpdatePayrollEmployeeConfig,
};
