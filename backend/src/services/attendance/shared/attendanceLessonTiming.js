const { combineLocalDateAndTimeToUtc } = require("../../../utils/tashkentTime");

function parseTimeToHoursMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || "").split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function createDarsDateTimeUTC(sana, boshlanishVaqti) {
  const parsed = parseTimeToHoursMinutes(boshlanishVaqti);
  if (!parsed) return null;
  const sanaIso = sana.toISOString().slice(0, 10);
  return combineLocalDateAndTimeToUtc(
    sanaIso,
    `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`,
  );
}

function buildRealLessonTiming({ sana, boshlanishVaqti, tugashVaqti }) {
  const startAt = createDarsDateTimeUTC(sana, boshlanishVaqti);
  const endAt = createDarsDateTimeUTC(sana, tugashVaqti);
  if (!startAt || !endAt) return null;
  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  return { startAt, endAt, durationMinutes };
}

module.exports = {
  parseTimeToHoursMinutes,
  createDarsDateTimeUTC,
  buildRealLessonTiming,
};
