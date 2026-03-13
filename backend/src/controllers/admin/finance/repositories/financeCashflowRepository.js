const prisma = require("../../../../prisma");

async function fetchFinancePayrollCashflowRows({
  prismaClient = prisma,
  monthStart,
  monthEnd,
}) {
  const mainOrg = await prismaClient.organization.findUnique({
    where: { key: "MAIN" },
    select: { id: true },
  });

  if (!mainOrg?.id) return [];

  return prismaClient.payrollCashEntry.groupBy({
    by: ["entryType"],
    where: {
      organizationId: mainOrg.id,
      occurredAt: { gte: monthStart, lt: monthEnd },
    },
    _sum: { amount: true },
  });
}

async function fetchFinanceCashflowPlanInputs({
  prismaClient = prisma,
  studentIds,
  monthStart,
  monthEnd,
}) {
  const ids = Array.from(
    new Set((studentIds || []).filter((id) => typeof id === "string" && id)),
  );

  if (!ids.length) {
    return {
      students: [],
      imtiyozRows: [],
      collectedAmount: 0,
    };
  }

  const [students, imtiyozRows, paidAgg] = await prismaClient.$transaction([
    prismaClient.student.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        createdAt: true,
        enrollments: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { startDate: true },
        },
      },
    }),
    prismaClient.tolovImtiyozi.findMany({
      where: { studentId: { in: ids } },
      select: {
        studentId: true,
        turi: true,
        qiymat: true,
        boshlanishYil: true,
        boshlanishOyRaqam: true,
        oylarSoni: true,
        isActive: true,
        bekorQilinganAt: true,
        oylarSnapshot: true,
      },
    }),
    prismaClient.tolovTranzaksiya.aggregate({
      where: {
        holat: "AKTIV",
        studentId: { in: ids },
        tolovSana: { gte: monthStart, lt: monthEnd },
      },
      _sum: { summa: true },
    }),
  ]);

  return {
    students,
    imtiyozRows,
    collectedAmount: Number(paidAgg?._sum?.summa || 0),
  };
}

module.exports = {
  fetchFinancePayrollCashflowRows,
  fetchFinanceCashflowPlanInputs,
};
