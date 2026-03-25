const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseTimeToHoursMinutes,
  createDarsDateTimeUTC,
  buildRealLessonTiming,
} = require("../src/services/attendance/shared/attendanceLessonTiming");

test("parseTimeToHoursMinutes valid vaqtni parse qiladi", () => {
  assert.deepEqual(parseTimeToHoursMinutes("08:30"), { hours: 8, minutes: 30 });
  assert.equal(parseTimeToHoursMinutes("24:00"), null);
  assert.equal(parseTimeToHoursMinutes("bad"), null);
});

test("createDarsDateTimeUTC va buildRealLessonTiming dars intervalini quradi", () => {
  const sana = new Date("2026-03-10T00:00:00.000Z");

  const startAt = createDarsDateTimeUTC(sana, "08:00");
  const timing = buildRealLessonTiming({
    sana,
    boshlanishVaqti: "08:00",
    tugashVaqti: "09:15",
  });

  assert.ok(startAt instanceof Date);
  assert.equal(timing.durationMinutes, 75);
  assert.ok(timing.endAt.getTime() > timing.startAt.getTime());
  assert.equal(
    buildRealLessonTiming({
      sana,
      boshlanishVaqti: "09:15",
      tugashVaqti: "09:00",
    }),
    null,
  );
});
