export function parseScheduleError(error, fallback) {
  return error?.message || error?.data?.message || fallback;
}

export function isScheduleConflictMessage(message) {
  return /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud|yuklama|limit/i.test(
    String(message || ''),
  );
}
