const prisma = require("../../../../prisma");

async function findStudentFinanceProfile({
  prismaClient = prisma,
  studentId,
}) {
  return prismaClient.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { username: true, phone: true } },
      enrollments: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { classroom: { select: { name: true, academicYear: true } } },
      },
    },
  });
}

async function findStudentBasic({
  prismaClient = prisma,
  studentId,
}) {
  return prismaClient.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
}

async function fetchStudentFinanceMajburiyatRows({
  prismaClient = prisma,
  studentId,
}) {
  return prismaClient.studentOyMajburiyat.findMany({
    where: { studentId },
    orderBy: [{ yil: "asc" }, { oy: "asc" }],
    select: {
      yil: true,
      oy: true,
      bazaSumma: true,
      imtiyozSumma: true,
      netSumma: true,
      tolanganSumma: true,
      qoldiqSumma: true,
      holat: true,
    },
  });
}

async function fetchStudentImtiyozRows({
  prismaClient = prisma,
  studentId,
}) {
  return prismaClient.tolovImtiyozi.findMany({
    where: { studentId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      studentId: true,
      turi: true,
      qiymat: true,
      boshlanishYil: true,
      boshlanishOyRaqam: true,
      oylarSoni: true,
      oylarSnapshot: true,
      sabab: true,
      izoh: true,
      isActive: true,
      createdAt: true,
      bekorQilinganAt: true,
      bekorQilishSababi: true,
    },
  });
}

async function fetchStudentPaymentTransactions({
  prismaClient = prisma,
  studentId,
}) {
  return prismaClient.tolovTranzaksiya.findMany({
    where: { studentId },
    include: {
      qoplamalar: {
        select: { yil: true, oy: true, summa: true },
        orderBy: [{ yil: "desc" }, { oy: "desc" }],
      },
    },
    orderBy: { tolovSana: "desc" },
  });
}

async function fetchStudentPaymentDraftStudent({
  prismaClient = prisma,
  studentId,
}) {
  return prismaClient.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      createdAt: true,
      enrollments: {
        where: { isActive: true },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        select: { id: true, startDate: true },
        take: 1,
      },
    },
  });
}

async function fetchStudentPaymentCoverageRows({
  prismaClient = prisma,
  studentId,
  months = [],
}) {
  if (!Array.isArray(months) || !months.length) return [];
  return prismaClient.tolovQoplama.findMany({
    where: {
      studentId,
      OR: months.map((month) => ({ yil: month.yil, oy: month.oy })),
    },
    select: { yil: true, oy: true, summa: true },
  });
}

async function findStudentImtiyozById({
  prismaClient = prisma,
  imtiyozId,
}) {
  return prismaClient.tolovImtiyozi.findUnique({
    where: { id: imtiyozId },
    select: {
      id: true,
      studentId: true,
      turi: true,
      qiymat: true,
      boshlanishYil: true,
      boshlanishOyRaqam: true,
      oylarSoni: true,
      oylarSnapshot: true,
      isActive: true,
    },
  });
}

module.exports = {
  findStudentFinanceProfile,
  findStudentBasic,
  fetchStudentFinanceMajburiyatRows,
  fetchStudentImtiyozRows,
  fetchStudentPaymentTransactions,
  fetchStudentPaymentDraftStudent,
  fetchStudentPaymentCoverageRows,
  findStudentImtiyozById,
};
