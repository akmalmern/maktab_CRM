import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Card, Input, Select, StateView } from '../../components/ui';
import { getLocalDateInputValue } from '../../lib/dateUtils';
import { useLazyGetTeacherScheduleQuery } from '../../services/api/teacherApi';

const HAFTA_KUNLARI = ['DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA'];
const KUN_LABEL_KEYS = {
  DUSHANBA: 'Dushanba',
  SESHANBA: 'Seshanba',
  CHORSHANBA: 'Chorshanba',
  PAYSHANBA: 'Payshanba',
  JUMA: 'Juma',
  SHANBA: 'Shanba',
};
const HAFTA_KUNI_TO_JS_DAY = {
  DUSHANBA: 1,
  SESHANBA: 2,
  CHORSHANBA: 3,
  PAYSHANBA: 4,
  JUMA: 5,
  SHANBA: 6,
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseTimeToMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || '').split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function getSlotDurationMinutes(vaqtOraliq) {
  const start = parseTimeToMinutes(vaqtOraliq?.boshlanishVaqti);
  const end = parseTimeToMinutes(vaqtOraliq?.tugashVaqti);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

function countWeekdayInMonth(monthKey, jsWeekday) {
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

function formatHours(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  if (!Number.isFinite(rounded)) return '0';
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function fanRangi(fanNomi) {
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

function sanaFromHaftaKuni(haftaKuni) {
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

export default function TeacherSchedulePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [oquvYili, setOquvYili] = useState('');
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [oquvYillar, setOquvYillar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darslar, setDarslar] = useState([]);
  const [fetchTeacherSchedule] = useLazyGetTeacherScheduleQuery();

  const loadSchedule = useCallback(async (nextYear = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTeacherSchedule(nextYear ? { oquvYili: nextYear } : {}).unwrap();
      setDarslar(data.darslar || []);
      setOquvYillar(data.oquvYillar || []);
      setOquvYili(data.oquvYili || nextYear || '');
    } catch (e) {
      const message = e?.message || t("Jadvalni olishda xatolik");
      setError(message);
      toast.error(message);
      setDarslar([]);
      setOquvYillar([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTeacherSchedule, t]);

  useEffect(() => {
    loadSchedule('');
  }, [loadSchedule]);

  const vaqtlar = useMemo(() => {
    const uniq = new Map();
    for (const dars of darslar) {
      if (dars.vaqtOraliq?.id && !uniq.has(dars.vaqtOraliq.id)) {
        uniq.set(dars.vaqtOraliq.id, dars.vaqtOraliq);
      }
    }
    return [...uniq.values()].sort((a, b) => (a.tartib || 0) - (b.tartib || 0));
  }, [darslar]);

  const gridMap = useMemo(() => {
    const map = new Map();
    for (const dars of darslar) {
      map.set(`${dars.haftaKuni}__${dars.vaqtOraliqId}`, dars);
    }
    return map;
  }, [darslar]);
  const loadSummary = useMemo(() => {
    let weeklyMinutes = 0;
    let monthlyMinutes = 0;
    let monthlyLessonCount = 0;

    for (const dars of darslar) {
      const duration = getSlotDurationMinutes(dars.vaqtOraliq);
      if (!duration) continue;
      weeklyMinutes += duration;

      const jsWeekday = HAFTA_KUNI_TO_JS_DAY[dars.haftaKuni];
      const lessonCount = countWeekdayInMonth(monthKey, jsWeekday);
      monthlyLessonCount += lessonCount;
      monthlyMinutes += lessonCount * duration;
    }

    return {
      weeklyLessonCount: darslar.length,
      weeklyHours: weeklyMinutes / 60,
      monthlyLessonCount,
      monthlyHours: monthlyMinutes / 60,
    };
  }, [darslar, monthKey]);

  function handleGoAttendance(dars) {
    const sana = sanaFromHaftaKuni(dars.haftaKuni);
    navigate(`/teacher/davomat?sana=${encodeURIComponent(sana)}&darsId=${encodeURIComponent(dars.id)}`);
  }

  return (
    <div className="space-y-4">
      <Card title={t('Mening haftalik jadvalim')}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadSchedule(oquvYili);
          }}
          className="grid grid-cols-1 gap-2 md:grid-cols-[240px_200px_auto]"
        >
          <Select
            value={oquvYili}
            onChange={(event) => setOquvYili(event.target.value)}
          >
            {oquvYillar.length ? (
              oquvYillar.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            ) : (
              <option value={oquvYili || ''}>{oquvYili || t("O'quv yili topilmadi")}</option>
            )}
          </Select>
          <Input
            type="month"
            value={monthKey}
            onChange={(event) => setMonthKey(event.target.value)}
          />
          <Button type="submit" variant="indigo">
            {t('Jadvalni yangilash')}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {t('Haftalik darslar')}: {loadSummary.weeklyLessonCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {t('Haftalik soat')}: {formatHours(loadSummary.weeklyHours)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {t("Oy bo'yicha darslar")}: {loadSummary.monthlyLessonCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-800">
            {t("Oy bo'yicha soat")}: {formatHours(loadSummary.monthlyHours)}
          </span>
        </div>
      </Card>

      {loading && <StateView type="loading" />}
      {!loading && error && <StateView type="error" description={error} />}

      {!loading && !error && (
        <Card title={t("Haftalik grid ko'rinishi")}>
          {vaqtlar.length ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 ring-1 ring-slate-200/40">
              <table className="w-full min-w-[980px] table-fixed text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-100 px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em]">{t('Vaqt')}</th>
                    {HAFTA_KUNLARI.map((kun) => (
                      <th key={kun} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                        {t(KUN_LABEL_KEYS[kun])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vaqtlar.map((vaqt) => (
                    <tr key={vaqt.id} className="border-b border-slate-100 align-top bg-white">
                      <td className="sticky left-0 z-10 w-28 bg-white px-2 py-2 text-slate-700 shadow-[6px_0_8px_-8px_rgba(15,23,42,0.2)]">
                        <p className="font-semibold text-slate-900">{vaqt.nomi}</p>
                        <p className="text-[11px] text-slate-500">
                          {vaqt.boshlanishVaqti} - {vaqt.tugashVaqti}
                        </p>
                      </td>
                      {HAFTA_KUNLARI.map((kun) => {
                        const dars = gridMap.get(`${kun}__${vaqt.id}`);
                        return (
                          <td key={`${kun}-${vaqt.id}`} className="px-2 py-2">
                            {dars ? (
                              <div className={`rounded-xl border p-2 shadow-sm ${fanRangi(dars.fan?.name)}`}>
                                <p className="truncate font-semibold text-slate-900">{dars.fan?.name}</p>
                                <p className="text-[11px] text-slate-700">
                                  {dars.sinf?.name} ({dars.sinf?.academicYear})
                                </p>
                                <Button
                                  size="sm"
                                  variant="indigo"
                                  className="mt-2"
                                  onClick={() => handleGoAttendance(dars)}
                                >
                                  {t("Davomatga o'tish")}
                                </Button>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2 text-[11px] text-slate-400">
                                {t("Bo'sh slot")}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <StateView type="empty" description={t('Jadvalda dars topilmadi')} />
          )}
        </Card>
      )}
    </div>
  );
}
