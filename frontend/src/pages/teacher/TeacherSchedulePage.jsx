import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Card, Input, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

const HAFTA_KUNLARI = ['DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA'];
const KUN_LABEL = {
  DUSHANBA: 'Dushanba',
  SESHANBA: 'Seshanba',
  CHORSHANBA: 'Chorshanba',
  PAYSHANBA: 'Payshanba',
  JUMA: 'Juma',
  SHANBA: 'Shanba',
};

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
  return target.toISOString().slice(0, 10);
}

export default function TeacherSchedulePage() {
  const navigate = useNavigate();
  const [oquvYili, setOquvYili] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darslar, setDarslar] = useState([]);

  const loadSchedule = useCallback(async (nextYear = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest({
        path: '/api/teacher/jadval',
        query: nextYear ? { oquvYili: nextYear } : {},
      });
      setDarslar(data.darslar || []);
      setOquvYili(data.oquvYili || nextYear || '');
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(message);
      setDarslar([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  function handleGoAttendance(dars) {
    const sana = sanaFromHaftaKuni(dars.haftaKuni);
    navigate(`/teacher/davomat?sana=${encodeURIComponent(sana)}&darsId=${encodeURIComponent(dars.id)}`);
  }

  return (
    <div className="space-y-4">
      <Card title="Mening haftalik jadvalim">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadSchedule(oquvYili);
          }}
          className="grid grid-cols-1 gap-2 md:grid-cols-[220px_auto]"
        >
          <Input
            type="text"
            value={oquvYili}
            onChange={(event) => setOquvYili(event.target.value)}
            placeholder="Masalan: 2025-2026"
          />
          <Button type="submit" variant="indigo">
            Jadvalni yangilash
          </Button>
        </form>
      </Card>

      {loading && <StateView type="loading" />}
      {!loading && error && <StateView type="error" description={error} />}

      {!loading && !error && (
        <Card title="Haftalik grid ko'rinishi">
          {vaqtlar.length ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[980px] table-fixed text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">Vaqt</th>
                    {HAFTA_KUNLARI.map((kun) => (
                      <th key={kun} className="px-2 py-2 text-left">
                        {KUN_LABEL[kun]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vaqtlar.map((vaqt) => (
                    <tr key={vaqt.id} className="border-b border-slate-100 align-top">
                      <td className="w-28 px-2 py-2 text-slate-700">
                        <p className="font-semibold">{vaqt.nomi}</p>
                        <p className="text-[11px] text-slate-500">
                          {vaqt.boshlanishVaqti} - {vaqt.tugashVaqti}
                        </p>
                      </td>
                      {HAFTA_KUNLARI.map((kun) => {
                        const dars = gridMap.get(`${kun}__${vaqt.id}`);
                        return (
                          <td key={`${kun}-${vaqt.id}`} className="px-2 py-2">
                            {dars ? (
                              <div className={`rounded-md border p-2 ${fanRangi(dars.fan?.name)}`}>
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
                                  Davomatga o'tish
                                </Button>
                              </div>
                            ) : (
                              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-400">
                                Bo'sh slot
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
            <StateView type="empty" description="Jadvalda dars topilmadi" />
          )}
        </Card>
      )}
    </div>
  );
}
