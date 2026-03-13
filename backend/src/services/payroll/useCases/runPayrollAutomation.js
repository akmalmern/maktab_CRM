async function executeRunPayrollAutomation({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    getActiveRunForPeriod,
    normalizeRequestedPeriodMonth,
    getPayrollAutomationHealth,
    generatePayrollRun,
    approvePayrollRun,
    payPayrollRun,
  } = deps;

  const periodMonth = normalizeRequestedPeriodMonth(body.periodMonth);
  const dryRun = body.dryRun === true;
  const autoApprove = body.autoApprove !== false;
  const autoPay = body.autoPay === true;
  const force = body.force === true;

  const healthBefore = await getPayrollAutomationHealth({
    query: {
      periodMonth,
      includeDetails: true,
    },
  });

  if (dryRun) {
    return {
      periodMonth,
      dryRun: true,
      steps: [],
      healthBefore,
      healthAfter: healthBefore,
      run: healthBefore.currentRun || null,
    };
  }

  if (!force && healthBefore.summary.blockerCount > 0) {
    throw new ApiError(
      409,
      "PAYROLL_AUTOMATION_BLOCKED",
      "Payroll avtomatlashtirishdan oldin blocker xatolarni bartaraf qiling",
      { health: healthBefore },
    );
  }

  const steps = [];
  let run = healthBefore.currentRun || null;

  if (body.generate !== false) {
    if (run?.status && run.status !== "DRAFT") {
      steps.push({
        step: "GENERATE",
        status: "SKIPPED",
        runId: run.id,
        reason: `run_status=${run.status}`,
      });
    } else {
      const generation = await generatePayrollRun({
        body: { periodMonth },
        actorUserId,
        req,
      });
      run = generation.run || run;
      steps.push({
        step: "GENERATE",
        status: "DONE",
        runId: run?.id || null,
        lessonCount: generation?.generation?.lessonsProcessed || 0,
      });
    }
  } else {
    steps.push({
      step: "GENERATE",
      status: "SKIPPED",
      reason: "generate=false",
      runId: run?.id || null,
    });
  }

  if (!run?.id) {
    run = await prisma.$transaction(async (tx) => {
      const org = await ensureMainOrganization(tx);
      return getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    });
  }

  if (autoApprove) {
    if (!run?.id) {
      throw new ApiError(409, "PAYROLL_RUN_NOT_FOUND", "Approve qilish uchun payroll run topilmadi");
    }
    if (run.status === "DRAFT") {
      const approved = await approvePayrollRun({
        runId: run.id,
        actorUserId,
        req,
      });
      run = approved.run;
      steps.push({
        step: "APPROVE",
        status: "DONE",
        runId: run.id,
      });
    } else {
      steps.push({
        step: "APPROVE",
        status: "SKIPPED",
        runId: run.id,
        reason: `run_status=${run.status}`,
      });
    }
  } else {
    steps.push({
      step: "APPROVE",
      status: "SKIPPED",
      runId: run?.id || null,
      reason: "autoApprove=false",
    });
  }

  if (autoPay) {
    if (!run?.id) {
      throw new ApiError(409, "PAYROLL_RUN_NOT_FOUND", "Pay qilish uchun payroll run topilmadi");
    }
    if (run.status === "APPROVED") {
      const paid = await payPayrollRun({
        runId: run.id,
        body: {
          paymentMethod: body.paymentMethod || "BANK",
          ...(body.paidAt ? { paidAt: body.paidAt } : {}),
          ...(body.externalRef ? { externalRef: body.externalRef } : {}),
          ...(body.note ? { note: body.note } : {}),
        },
        actorUserId,
        req,
      });
      run = paid.run;
      steps.push({
        step: "PAY",
        status: "DONE",
        runId: run.id,
        paidTotal: paid.paidTotal,
        itemPaymentsCreated: paid.itemPaymentsCreated,
      });
    } else {
      steps.push({
        step: "PAY",
        status: "SKIPPED",
        runId: run.id,
        reason: `run_status=${run.status}`,
      });
    }
  } else {
    steps.push({
      step: "PAY",
      status: "SKIPPED",
      runId: run?.id || null,
      reason: "autoPay=false",
    });
  }

  const healthAfter = await getPayrollAutomationHealth({
    query: {
      periodMonth,
      includeDetails: false,
    },
  });

  let runSnapshot = null;
  if (run?.id) {
    runSnapshot = await prisma.$transaction(async (tx) => {
      const org = await ensureMainOrganization(tx);
      return tx.payrollRun.findFirst({
        where: { id: run.id, organizationId: org.id },
        include: {
          items: {
            orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
            include: {
              employee: {
                select: {
                  id: true,
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
    });
  }

  return {
    periodMonth,
    dryRun: false,
    steps,
    healthBefore,
    healthAfter,
    run: runSnapshot,
  };
}

module.exports = {
  executeRunPayrollAutomation,
};
