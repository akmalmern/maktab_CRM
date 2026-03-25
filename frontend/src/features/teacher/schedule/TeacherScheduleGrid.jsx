import { Card, Button, StateView } from '../../../components/ui';
import { formatScheduleSlotLabel } from '../../../lib/scheduleSlotLabel';
import {
  fanRangi,
  HAFTA_KUNLARI,
  KUN_LABEL_KEYS,
} from './teacherScheduleModel';

export default function TeacherScheduleGrid({
  t,
  i18nLanguage,
  vaqtlar,
  gridMap,
  onGoAttendance,
}) {
  return (
    <Card title={t("Haftalik grid ko'rinishi")}>
      {vaqtlar.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 ring-1 ring-slate-200/40">
          <table className="w-full min-w-[980px] table-fixed text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                  {t('Vaqt')}
                </th>
                {HAFTA_KUNLARI.map((kun) => (
                  <th
                    key={kun}
                    className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    {t(KUN_LABEL_KEYS[kun])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vaqtlar.map((vaqt) => (
                <tr key={vaqt.id} className="border-b border-slate-100 align-top bg-white">
                  <td className="sticky left-0 z-10 w-28 bg-white px-2 py-2 text-slate-700 shadow-[6px_0_8px_-8px_rgba(15,23,42,0.2)]">
                    <p className="font-semibold text-slate-900">
                      {formatScheduleSlotLabel(vaqt.nomi, i18nLanguage)}
                    </p>
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
                              onClick={() => onGoAttendance(dars)}
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
  );
}
