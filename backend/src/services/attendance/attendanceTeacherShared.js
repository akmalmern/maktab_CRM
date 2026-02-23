const { HaftaKuni } = require("@prisma/client");
const { ApiError } = require("../../utils/apiError");

const HAFTA_KUNLARI = [
  HaftaKuni.DUSHANBA,
  HaftaKuni.SESHANBA,
  HaftaKuni.CHORSHANBA,
  HaftaKuni.PAYSHANBA,
  HaftaKuni.JUMA,
  HaftaKuni.SHANBA,
];

function haftaKuniFromDate(sana) {
  const jsDay = sana.getUTCDay();
  if (jsDay === 0) return null;
  return HAFTA_KUNLARI[jsDay - 1];
}

function ensureDateMatchesLessonDay(sana, darsHaftaKuni) {
  const kiritilganKun = haftaKuniFromDate(sana);
  if (!kiritilganKun || kiritilganKun !== darsHaftaKuni) {
    throw new ApiError(
      400,
      "DARS_SANA_NOMOS",
      `Bu dars ${darsHaftaKuni} kuniga tegishli. Sana va dars kuni mos emas.`,
    );
  }
}

function findStudentPrimaryBaho(baholar, studentId) {
  const studentBaholari = baholar.filter(
    (item) => item.studentId === studentId,
  );
  if (!studentBaholari.length) return null;
  return (
    studentBaholari.find((item) => item.turi === "JORIY") || studentBaholari[0]
  );
}

module.exports = {
  HAFTA_KUNLARI,
  haftaKuniFromDate,
  ensureDateMatchesLessonDay,
  findStudentPrimaryBaho,
};
