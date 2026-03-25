import { getLocalDateInputValue } from '../../../lib/dateUtils';

export const HAFTA_KUNLARI = ['DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA'];
export const KUN_LABEL_KEYS = {
  DUSHANBA: 'Dushanba',
  SESHANBA: 'Seshanba',
  CHORSHANBA: 'Chorshanba',
  PAYSHANBA: 'Payshanba',
  JUMA: 'Juma',
  SHANBA: 'Shanba',
};
export const HAFTA_KUNI_TO_JS_DAY = {
  DUSHANBA: 1,
  SESHANBA: 2,
  CHORSHANBA: 3,
  PAYSHANBA: 4,
  JUMA: 5,
  SHANBA: 6,
};

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function parseTimeToMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || '').split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

export function getSlotDurationMinutes(vaqtOraliq) {
  const start = parseTimeToMinutes(vaqtOraliq?.boshlanishVaqti);
  const end = parseTimeToMinutes(vaqtOraliq?.tugashVaqti);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

export function countWeekdayInMonth(monthKey, jsWeekday) {
  const match = String(monthKey || '').match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match || !Number.isInteger(jsWeekday)) return 0;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const lastDay = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= lastDay; day += 1) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === jsWeekday) count += 1;
  }
  return count;
}

export function formatHours(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  if (!Number.isFinite(rounded)) return '0';
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function fanRangi(fanNomi) {
  const palitra = [
    'bg-sky-50 border-sky-200',
    'bg-emerald-50 border-emerald-200',
    'bg-amber-50 border-amber-200',
    'bg-rose-50 border-rose-200',
    'bg-violet-50 border-violet-200',
    'bg-cyan-50 border-cyan-200',
  ];
  if (!fanNomi) return palitra[0];
  const sum = [...fanNomi].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palitra[sum % palitra.length];
}

export function sanaFromHaftaKuni(haftaKuni) {
  const today = new Date();
  const jsDay = today.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const index = HAFTA_KUNLARI.indexOf(haftaKuni);
  const target = new Date(monday);
  target.setDate(monday.getDate() + Math.max(index, 0));
  return getLocalDateInputValue(target);
}

export function buildTeacherScheduleSummary(darslar, monthKey) {
  let weeklyMinutes = 0;
  let monthlyMinutes = 0;
  let monthlyLessonCount = 0;

  for (const dars of darslar || []) {
    const duration = getSlotDurationMinutes(dars.vaqtOraliq);
    if (!duration) continue;
    weeklyMinutes += duration;

    const jsWeekday = HAFTA_KUNI_TO_JS_DAY[dars.haftaKuni];
    const lessonCount = countWeekdayInMonth(monthKey, jsWeekday);
    monthlyLessonCount += lessonCount;
    monthlyMinutes += lessonCount * duration;
  }

  return {
    weeklyLessonCount: (darslar || []).length,
    weeklyHours: weeklyMinutes / 60,
    monthlyLessonCount,
    monthlyHours: monthlyMinutes / 60,
  };
}
