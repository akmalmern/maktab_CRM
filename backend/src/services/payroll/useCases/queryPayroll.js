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

async function findTeacherByUserId({ tx, userId, ApiError }) {
  const teacher = await tx.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } },
  });
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher topilmadi");
  return teacher;
}

async function buildPayrollRunExportDataTx({ deps, tx, runId, query }) {
  const { ApiError, ensureMainOrganization, toIsoOrEmpty } = deps;

  const org = await ensureMainOrganization(tx);
  const run = await tx.payrollRun.findFirst({
    where: { id: runId, organizationId: org.id },
    include: {
      items: {
        orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
        include: {
          employee: {
            select: {
              id: true,
              kind: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
        },
      },
    },
  });
  if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");

  const linesWhere = { payrollRunId: run.id };
  if (query?.teacherId) linesWhere.teacherId = query.teacherId;
  if (query?.employeeId) linesWhere.employeeId = query.employeeId;
  if (query?.type) linesWhere.type = query.type;

  const lines = await tx.payrollLine.findMany({
    where: linesWhere,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      employee: {
        select: {
          id: true,
          kind: true,
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
      teacher: {
        select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } },
      },
      subject: { select: { id: true, name: true } },
      classroom: { select: { id: true, name: true, academicYear: true } },
      realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
    },
  });

  const itemById = new Map((run.items || []).map((item) => [item.id, item]));
  const csvRows = [[
    "rowKind",
    "payrollRunId",
    "periodMonth",
    "runStatus",
    "teacherId",
    "teacherName",
    "teacherUsername",
    "itemTotalMinutes",
    "itemGrossAmount",
    "itemAdjustmentAmount",
    "itemPayableAmount",
    "itemPaidAmount",
    "itemPaymentStatus",
    "lineId",
    "lineType",
    "lessonId",
    "lessonStartAt",
    "lessonEndAt",
    "lessonStatus",
    "subject",
    "classroom",
    "minutes",
    "ratePerHour",
    "amount",
    "description",
    "createdAt",
  ]];
  const itemRows = [];
  const lineRows = [];

  for (const item of run.items || []) {
    const teacherName =
      (item.employee && `${item.employee.firstName || ""} ${item.employee.lastName || ""}`.trim()) ||
      (item.teacher && `${item.teacher.firstName || ""} ${item.teacher.lastName || ""}`.trim()) ||
      `${item.teacherFirstNameSnapshot || ""} ${item.teacherLastNameSnapshot || ""}`.trim() ||
      item.teacherId ||
      item.employeeId ||
      "";
    const teacherUsername =
      item.employee?.user?.username || item.teacher?.user?.username || item.teacherUsernameSnapshot || "";

    csvRows.push([
      "ITEM",
      run.id,
      run.periodMonth,
      run.status,
      item.teacherId || item.employeeId || "",
      teacherName,
      teacherUsername,
      item.totalMinutes ?? 0,
      String(item.grossAmount ?? 0),
      String(item.adjustmentAmount ?? 0),
      String(item.payableAmount ?? 0),
      String(item.paidAmount ?? 0),
      item.paymentStatus || "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    itemRows.push({
      "Payroll run ID": run.id,
      Oy: run.periodMonth,
      Holat: run.status,
      "O'qituvchi ID": item.teacherId || item.employeeId || "",
      "O'qituvchi": teacherName,
      Username: teacherUsername ? `@${teacherUsername}` : "",
      "Jami daqiqa": Number(item.totalMinutes || 0),
      Brutto: Number(item.grossAmount || 0),
      Tuzatish: Number(item.adjustmentAmount || 0),
      "To'lanadi": Number(item.payableAmount || 0),
      "To'langan": Number(item.paidAmount || 0),
      "To'lov holati": item.paymentStatus || "",
    });
  }

  for (const line of lines) {
    const item = itemById.get(line.payrollItemId);
    const teacherName =
      (line.employee && `${line.employee.firstName || ""} ${line.employee.lastName || ""}`.trim()) ||
      (line.teacher && `${line.teacher.firstName || ""} ${line.teacher.lastName || ""}`.trim()) ||
      `${item?.teacherFirstNameSnapshot || ""} ${item?.teacherLastNameSnapshot || ""}`.trim() ||
      line.teacherId ||
      line.employeeId ||
      "";
    const teacherUsername =
      line.employee?.user?.username ||
      line.teacher?.user?.username ||
      item?.teacherUsernameSnapshot ||
      "";

    csvRows.push([
      "LINE",
      run.id,
      run.periodMonth,
      run.status,
      line.teacherId || line.employeeId || "",
      teacherName,
      teacherUsername,
      item?.totalMinutes ?? "",
      item ? String(item.grossAmount ?? 0) : "",
      item ? String(item.adjustmentAmount ?? 0) : "",
      item ? String(item.payableAmount ?? 0) : "",
      item ? String(item.paidAmount ?? 0) : "",
      item?.paymentStatus || "",
      line.id,
      line.type,
      line.realLessonId || "",
      toIsoOrEmpty(line.realLesson?.startAt || line.lessonStartAt),
      toIsoOrEmpty(line.realLesson?.endAt),
      line.realLesson?.status || "",
      line.subject?.name || "",
      line.classroom ? `${line.classroom.name} (${line.classroom.academicYear})` : "",
      line.minutes ?? "",
      line.ratePerHour != null ? String(line.ratePerHour) : "",
      String(line.amount ?? 0),
      line.description || "",
      toIsoOrEmpty(line.createdAt),
    ]);

    lineRows.push({
      "Line ID": line.id,
      "Payroll run ID": run.id,
      Oy: run.periodMonth,
      Holat: run.status,
      Tip: line.type,
      "O'qituvchi ID": line.teacherId || line.employeeId || "",
      "O'qituvchi": teacherName,
      Username: teacherUsername ? `@${teacherUsername}` : "",
      Fan: line.subject?.name || "",
      Sinf: line.classroom ? `${line.classroom.name} (${line.classroom.academicYear})` : "",
      Daqiqa: Number(line.minutes || 0),
      "Soat narxi": line.ratePerHour != null ? Number(line.ratePerHour) : null,
      Summa: Number(line.amount || 0),
      "Dars boshlanishi": toIsoOrEmpty(line.realLesson?.startAt || line.lessonStartAt),
      "Dars tugashi": toIsoOrEmpty(line.realLesson?.endAt),
      "Dars holati": line.realLesson?.status || "",
      Izoh: line.description || "",
      "Yaratilgan vaqt": toIsoOrEmpty(line.createdAt),
    });
  }

  return { run, csvRows, itemRows, lineRows };
}

async function executeListPayrollRuns({ deps, query }) {
  const { prisma, ensureMainOrganization } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = { organizationId: org.id };
    if (query.periodMonth) where.periodMonth = query.periodMonth;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      tx.payrollRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
        include: {
          createdByUser: { select: { id: true, username: true } },
          approvedByUser: { select: { id: true, username: true } },
          paidByUser: { select: { id: true, username: true } },
          reversedByUser: { select: { id: true, username: true } },
        },
      }),
      tx.payrollRun.count({ where }),
    ]);

    return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), runs: items };
  });
}

async function executeGetPayrollRunDetail({ deps, runId, query }) {
  const { prisma, ApiError, ensureMainOrganization, money, decimal } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 50, maxLimit: 200 });

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, organizationId: org.id },
      include: {
        createdByUser: { select: { id: true, username: true } },
        approvedByUser: { select: { id: true, username: true } },
        paidByUser: { select: { id: true, username: true } },
        reversedByUser: { select: { id: true, username: true } },
        items: {
          orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
          include: {
            employee: {
              select: {
                id: true,
                kind: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
    });
    if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");

    const linesWhere = { payrollRunId: run.id };
    if (query.teacherId) linesWhere.teacherId = query.teacherId;
    if (query.employeeId) linesWhere.employeeId = query.employeeId;
    if (query.type) linesWhere.type = query.type;

    const [items, total] = await Promise.all([
      tx.payrollLine.findMany({
        where: linesWhere,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          employee: {
            select: { id: true, kind: true, firstName: true, lastName: true, user: { select: { username: true } } },
          },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
        },
      }),
      tx.payrollLine.count({ where: linesWhere }),
    ]);

    const lessonLineGroups = await tx.payrollLine.groupBy({
      where: { payrollRunId: run.id, type: "LESSON" },
      by: ["payrollItemId", "subjectId", "ratePerHour", "rateSource"],
      _sum: { minutes: true, amount: true },
      _count: { _all: true },
    });
    const subjectIds = [...new Set(lessonLineGroups.map((row) => row.subjectId).filter(Boolean))];
    const subjects = subjectIds.length
      ? await tx.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      })
      : [];
    const subjectById = new Map(subjects.map((row) => [row.id, row]));
    const lessonBreakdownByItemId = new Map();

    for (const group of lessonLineGroups) {
      const subjectName = subjectById.get(group.subjectId)?.name || group.subjectId || "-";
      const minutes = Number(group._sum.minutes || 0);
      const row = {
        subjectId: group.subjectId || null,
        subjectName,
        ratePerHour: group.ratePerHour,
        rateSource: group.rateSource || null,
        lessonMinutes: minutes,
        lessonHours: money(decimal(minutes).div(60)),
        amount: money(group._sum.amount || 0),
        lessonCount: Number(group._count?._all || 0),
      };
      const bucket = lessonBreakdownByItemId.get(group.payrollItemId) || [];
      bucket.push(row);
      lessonBreakdownByItemId.set(group.payrollItemId, bucket);
    }

    const runWithBreakdown = {
      ...run,
      items: (run.items || []).map((item) => {
        const subjectBreakdown = (lessonBreakdownByItemId.get(item.id) || [])
          .slice()
          .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        const primarySubject = subjectBreakdown[0] || null;
        return {
          ...item,
          subjectBreakdown,
          primarySubjectName: primarySubject?.subjectName || null,
          primaryRatePerHour: primarySubject?.ratePerHour || null,
        };
      }),
    };

    return {
      run: runWithBreakdown,
      lines: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        items,
      },
    };
  });
}

async function executeExportPayrollRunCsv({ deps, runId, query }) {
  const { prisma, buildCsv } = deps;
  return prisma.$transaction(async (tx) => {
    const { run, csvRows } = await buildPayrollRunExportDataTx({ deps, tx, runId, query });
    const csvBody = "\uFEFFsep=,\r\n" + buildCsv(csvRows);
    const fileName = `payroll-${run.periodMonth}-${run.id}.csv`;
    return { fileName, csv: csvBody };
  });
}

async function executeExportPayrollRunExcel({ deps, runId, query }) {
  const { ApiError, prisma } = deps;
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new ApiError(
      500,
      "XLSX_NOT_INSTALLED",
      "Excel export uchun 'xlsx' paketi o'rnatilmagan",
    );
  }

  return prisma.$transaction(async (tx) => {
    const { run, itemRows, lineRows } = await buildPayrollRunExportDataTx({ deps, tx, runId, query });
    const workbook = XLSX.utils.book_new();
    const itemSheet = XLSX.utils.json_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(workbook, itemSheet, "Oylik");
    if (lineRows.length) {
      const linesSheet = XLSX.utils.json_to_sheet(lineRows);
      XLSX.utils.book_append_sheet(workbook, linesSheet, "Tafsilot");
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    const fileName = `payroll-${run.periodMonth}-${run.id}.xlsx`;
    return { fileName, buffer };
  });
}

async function executeGetTeacherPayslipsByUserId({ deps, userId, query }) {
  const { prisma, ApiError } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

  return prisma.$transaction(async (tx) => {
    const teacher = await findTeacherByUserId({ tx, userId, ApiError });
    const where = { teacherId: teacher.id };
    if (query.status || query.periodMonth) {
      where.payrollRun = { is: {} };
      if (query.status) where.payrollRun.is.status = query.status;
      if (query.periodMonth) where.payrollRun.is.periodMonth = query.periodMonth;
    }

    const [items, total] = await Promise.all([
      tx.payrollItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ payrollRun: { periodStart: "desc" } }, { createdAt: "desc" }],
        include: {
          payrollRun: {
            select: {
              id: true,
              periodMonth: true,
              periodStart: true,
              periodEnd: true,
              status: true,
              approvedAt: true,
              paidAt: true,
              paymentMethod: true,
              externalRef: true,
            },
          },
        },
      }),
      tx.payrollItem.count({ where }),
    ]);

    return {
      teacher,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      payslips: items,
    };
  });
}

async function executeGetTeacherPayslipDetailByUserId({ deps, userId, runId, query }) {
  const { prisma, ApiError } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 100, maxLimit: 200 });

  return prisma.$transaction(async (tx) => {
    const teacher = await findTeacherByUserId({ tx, userId, ApiError });
    const item = await tx.payrollItem.findFirst({
      where: { payrollRunId: runId, teacherId: teacher.id },
      include: {
        payrollRun: {
          select: {
            id: true,
            periodMonth: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            approvedAt: true,
            paidAt: true,
            paymentMethod: true,
            externalRef: true,
            paymentNote: true,
            reverseReason: true,
          },
        },
      },
    });
    if (!item) throw new ApiError(404, "PAYSLIP_NOT_FOUND", "Payslip topilmadi");

    const linesWhere = { payrollRunId: runId, teacherId: teacher.id };
    if (query.type) linesWhere.type = query.type;

    const [items, total] = await Promise.all([
      tx.payrollLine.findMany({
        where: linesWhere,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          subject: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, academicYear: true } },
          realLesson: { select: { id: true, startAt: true, endAt: true, durationMinutes: true, status: true } },
        },
      }),
      tx.payrollLine.count({ where: linesWhere }),
    ]);

    return {
      teacher,
      payslip: item,
      lines: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        items,
      },
    };
  });
}

module.exports = {
  executeListPayrollRuns,
  executeGetPayrollRunDetail,
  executeExportPayrollRunCsv,
  executeExportPayrollRunExcel,
  executeGetTeacherPayslipsByUserId,
  executeGetTeacherPayslipDetailByUserId,
};
