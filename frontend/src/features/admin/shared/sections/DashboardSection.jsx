import { useMemo } from 'react';
import AutoTranslate from '../../../../components/AutoTranslate';
import { Card } from '../../../../components/ui';
import { DashboardStats } from '../../../../components/admin';

const DAY_BY_JS = {
  1: 'DUSHANBA',
  2: 'SESHANBA',
  3: 'CHORSHANBA',
  4: 'PAYSHANBA',
  5: 'JUMA',
  6: 'SHANBA',
};

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function DashboardSection({ headerStats, attendanceReport, darslar = [] }) {
  const jsDay = new Date().getDay();
  const haftaKuni = DAY_BY_JS[jsDay];

  const todayLessons = useMemo(() => {
    if (!haftaKuni) return 0;
    return darslar.filter((d) => d.haftaKuni === haftaKuni).length;
  }, [darslar, haftaKuni]);

  const foizlar = attendanceReport?.foizlar || {};
  const snapshotStats = [
    { label: 'Bugungi darslar', value: todayLessons },
    { label: 'Davomat', value: pct(foizlar.kunlik) },
    { label: 'Haftalik foiz', value: pct(foizlar.haftalik) },
  ];

  return (
    <AutoTranslate>
      <div className="space-y-6">
      <DashboardStats stats={headerStats} />

      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900">Bugungi snapshot</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {snapshotStats.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      </div>
    </AutoTranslate>
  );
}
