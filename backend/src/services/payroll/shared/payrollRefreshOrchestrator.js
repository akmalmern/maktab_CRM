async function tryRefreshDraftPayrollForLesson({
  lessonId,
  actorUserId,
  req,
  refreshDraftPayrollForLesson,
  ApiError,
  logError = console.error,
}) {
  try {
    const result = await refreshDraftPayrollForLesson({
      lessonId,
      actorUserId,
      req,
    });
    return {
      lessonId,
      refreshed: true,
      skipped: false,
      reason: null,
      runId: result?.runId || null,
    };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === "PAYROLL_RUN_LOCKED" ||
        error.code === "PAYROLL_RATE_NOT_FOUND" ||
        error.code === "REAL_LESSON_NOT_FOUND")
    ) {
      return {
        lessonId,
        refreshed: false,
        skipped: true,
        reason: error.code,
      };
    }
    logError("[PAYROLL_REAL_LESSON_REFRESH]", {
      lessonId,
      code: error?.code || null,
      message: error?.message || "unknown",
    });
    return {
      lessonId,
      refreshed: false,
      skipped: true,
      reason: error?.code || "UNKNOWN_ERROR",
    };
  }
}

async function executeRefreshDraftPayrollForLessonsSafe({
  lessonIds = [],
  actorUserId,
  req,
  refreshDraftPayrollForLesson,
  ApiError,
  logError = console.error,
}) {
  const uniqueLessonIds = [...new Set((lessonIds || []).filter(Boolean))];
  const results = [];
  for (const lessonId of uniqueLessonIds) {
    // Scope lock xavfsizligi uchun refreshni ketma-ket ishlatamiz.
    results.push(
      await tryRefreshDraftPayrollForLesson({
        lessonId,
        actorUserId,
        req,
        refreshDraftPayrollForLesson,
        ApiError,
        logError,
      }),
    );
  }
  const skippedByReason = {};
  for (const row of results) {
    if (!row.skipped || !row.reason) continue;
    skippedByReason[row.reason] = Number(skippedByReason[row.reason] || 0) + 1;
  }
  return {
    attemptedCount: uniqueLessonIds.length,
    refreshedCount: results.filter((row) => row.refreshed).length,
    skippedCount: results.filter((row) => row.skipped).length,
    skippedByReason,
    details: results.slice(0, 50),
  };
}

module.exports = {
  executeRefreshDraftPayrollForLessonsSafe,
};
