import { useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Select, StateView, Textarea } from '../../../../components/ui';

function sumFormat(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

function todayMonth() {
  return new Date().toISOString().slice(0, 7);
}

function statusBadge(holat) {
  if (holat === 'QARZDOR') {
    return <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Qarzdor</span>;
  }
  return <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">To'lagan</span>;
}

const OY_NOMLARI = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

function formatMonthKey(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 2) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return value;
  return `${OY_NOMLARI[month - 1]} ${year}`;
}

export default function FinanceSection({
  classrooms,
  settings,
  studentsState,
  detailState,
  query,
  actionLoading,
  onChangeQuery,
  onRefresh,
  onSaveSettings,
  onOpenDetail,
  onCreatePayment,
  onExportDebtors,
  onRevertPayment,
  exporting,
}) {
  const [settingsDraft, setSettingsDraft] = useState({
    oylikSumma: '',
    yillikSumma: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    turi: 'OYLIK',
    startMonth: todayMonth(),
    oylarSoni: 1,
    summa: '',
    izoh: '',
  });

  const students = studentsState.items || [];
  const detailStudent = detailState.student;
  const transactions = detailState.transactions || [];

  const pageLabel = useMemo(
    () => `Sahifa: ${studentsState.page} / ${studentsState.pages || 1}`,
    [studentsState.page, studentsState.pages],
  );

  function openPaymentModal(studentId) {
    setSelectedStudentId(studentId);
    setPaymentForm({
      turi: 'OYLIK',
      startMonth: todayMonth(),
      oylarSoni: 1,
      summa: '',
      izoh: '',
    });
    setModalOpen(true);
    onOpenDetail(studentId);
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    const ok = await onSaveSettings({
      oylikSumma: Number(settingsDraft.oylikSumma || settings.oylikSumma),
      yillikSumma: Number(settingsDraft.yillikSumma || settings.yillikSumma),
    });
    if (ok) {
      onRefresh();
    }
  }

  async function handleCreatePayment(e) {
    e.preventDefault();
    const payload = {
      turi: paymentForm.turi,
      startMonth: paymentForm.startMonth,
      izoh: paymentForm.izoh || undefined,
    };

    if (paymentForm.turi === 'YILLIK') {
      payload.oylarSoni = 12;
    } else if (paymentForm.turi === 'OYLIK') {
      payload.oylarSoni = Number(paymentForm.oylarSoni || 1);
    }

    if (paymentForm.summa !== '') {
      payload.summa = Number(paymentForm.summa);
    }

    const ok = await onCreatePayment(selectedStudentId, payload);
    if (ok) {
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  async function handleRevertPayment(tolovId) {
    const yes = window.confirm("Bu to'lovni bekor qilmoqchimisiz?");
    if (!yes) return;
    const ok = await onRevertPayment(tolovId);
    if (ok) {
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Moliya sozlamalari">
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Input
            type="number"
            min={0}
            value={settingsDraft.oylikSumma || settings.oylikSumma || ''}
            onChange={(e) => setSettingsDraft((p) => ({ ...p, oylikSumma: e.target.value }))}
            placeholder="Oylik summa"
          />
          <Input
            type="number"
            min={0}
            value={settingsDraft.yillikSumma || settings.yillikSumma || ''}
            onChange={(e) => setSettingsDraft((p) => ({ ...p, yillikSumma: e.target.value }))}
            placeholder="Yillik summa"
          />
          <Button type="submit" variant="indigo" disabled={actionLoading}>
            Saqlash
          </Button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Joriy: oylik {sumFormat(settings.oylikSumma)} so'm, yillik {sumFormat(settings.yillikSumma)} so'm
        </p>
      </Card>

      <Card title="To'lovlar ro'yxati" actions={<span className="text-sm text-slate-500">{pageLabel}</span>}>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
          <Input
            type="text"
            value={query.search}
            onChange={(e) => onChangeQuery({ search: e.target.value, page: 1 })}
            placeholder="Ism yoki username..."
          />
          <Select value={query.status} onChange={(e) => onChangeQuery({ status: e.target.value, page: 1 })}>
            <option value="ALL">Hammasi</option>
            <option value="QARZDOR">Faqat qarzdorlar</option>
            <option value="TOLAGAN">Faqat to'laganlar</option>
          </Select>
          <Select value={query.classroomId} onChange={(e) => onChangeQuery({ classroomId: e.target.value, page: 1 })}>
            <option value="all">Barcha sinflar</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear})
              </option>
            ))}
          </Select>
          <Select value={String(query.limit)} onChange={(e) => onChangeQuery({ limit: Number(e.target.value), page: 1 })}>
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} ta / sahifa
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={onRefresh}>
            Yangilash
          </Button>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={Boolean(exporting)}
            onClick={() => onExportDebtors?.('xlsx')}
          >
            {exporting === 'xlsx' ? 'Excel yuklanmoqda...' : "Qarzdorlar Excel"}
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(exporting)}
            onClick={() => onExportDebtors?.('pdf')}
          >
            {exporting === 'pdf' ? 'PDF yuklanmoqda...' : "Qarzdorlar PDF"}
          </Button>
        </div>

        {studentsState.loading && <StateView type="skeleton" />}
        {studentsState.error && <StateView type="error" description={studentsState.error} />}

        {!studentsState.loading && !studentsState.error && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">F.I.SH</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Sinf</th>
                  <th className="px-3 py-2">Holat</th>
                  <th className="px-3 py-2">Qarz oylar</th>
                  <th className="px-3 py-2">Jami qarz</th>
                  <th className="px-3 py-2">Amal</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{row.fullName}</td>
                    <td className="px-3 py-2">{row.username}</td>
                    <td className="px-3 py-2">{row.classroom}</td>
                    <td className="px-3 py-2">{statusBadge(row.holat)}</td>
                    <td className="px-3 py-2">
                      {row.qarzOylarSoni
                        ? (row.qarzOylarFormatted?.length
                            ? row.qarzOylarFormatted
                            : (row.qarzOylar || []).map(formatMonthKey)
                          ).join(', ')
                        : '-'}
                    </td>
                    <td className="px-3 py-2">{sumFormat(row.jamiQarzSumma)} so'm</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="indigo" onClick={() => openPaymentModal(row.id)}>
                        To'lov qildi
                      </Button>
                    </td>
                  </tr>
                ))}
                {!students.length && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      Ma'lumot topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChangeQuery({ page: Math.max(1, query.page - 1) })}
            disabled={query.page <= 1}
          >
            Oldingi
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChangeQuery({ page: Math.min(studentsState.pages || 1, query.page + 1) })}
            disabled={query.page >= (studentsState.pages || 1)}
          >
            Keyingi
          </Button>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Student to'lovini belgilash" maxWidth="max-w-3xl">
        {!selectedStudentId ? (
          <StateView type="empty" description="Student tanlanmagan" />
        ) : (
          <div className="space-y-4">
            {detailState.loading ? (
              <StateView type="loading" />
            ) : detailState.error ? (
              <StateView type="error" description={detailState.error} />
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{detailStudent?.fullName || '-'}</p>
                  <p className="mt-1 text-slate-600">
                    Qarzdor oylar: {detailStudent?.qarzOylarSoni || 0} ta
                  </p>
                </div>

                <form onSubmit={handleCreatePayment} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Select
                    value={paymentForm.turi}
                    onChange={(e) =>
                      setPaymentForm((p) => {
                        const nextType = e.target.value;
                        if (nextType === 'YILLIK') {
                          return { ...p, turi: nextType, oylarSoni: 12 };
                        }
                        return { ...p, turi: nextType, oylarSoni: p.oylarSoni || 1 };
                      })
                    }
                  >
                    <option value="OYLIK">Oylik</option>
                    <option value="YILLIK">Yillik</option>
                    <option value="IXTIYORIY">Ixtiyoriy</option>
                  </Select>
                  <Input
                    type="month"
                    value={paymentForm.startMonth}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, startMonth: e.target.value }))}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={paymentForm.oylarSoni}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, oylarSoni: e.target.value }))}
                    placeholder="Oylar soni"
                    disabled={paymentForm.turi === 'YILLIK' || paymentForm.turi === 'IXTIYORIY'}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={paymentForm.summa}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, summa: e.target.value }))}
                    placeholder="Summa (ixtiyoriy)"
                  />
                  <div className="md:col-span-2">
                    <Textarea
                      rows={2}
                      value={paymentForm.izoh}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, izoh: e.target.value }))}
                      placeholder="Izoh (ixtiyoriy)"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                      Yopish
                    </Button>
                    <Button type="submit" variant="success" disabled={actionLoading}>
                      To'lovni saqlash
                    </Button>
                  </div>
                </form>

                <Card title="To'lovlar tarixi">
                  <div className="max-h-64 overflow-auto rounded border border-slate-200">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Sana</th>
                          <th className="px-3 py-2">Turi</th>
                          <th className="px-3 py-2">Holat</th>
                          <th className="px-3 py-2">Summa</th>
                          <th className="px-3 py-2">Qoplangan oylar</th>
                          <th className="px-3 py-2">Amal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">{new Date(t.tolovSana).toLocaleDateString('uz-UZ')}</td>
                            <td className="px-3 py-2">{t.turi}</td>
                            <td className="px-3 py-2">
                              {t.holat === 'BEKOR_QILINGAN' ? (
                                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                  Bekor qilingan
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                  Aktiv
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">{sumFormat(t.summa)} so'm</td>
                            <td className="px-3 py-2">
                              {(t.qoplanganOylarFormatted?.length
                                ? t.qoplanganOylarFormatted
                                : (t.qoplanganOylar || []).map(formatMonthKey)
                              ).join(', ') || '-'}
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleRevertPayment(t.id)}
                                disabled={actionLoading || t.holat === 'BEKOR_QILINGAN'}
                              >
                                Bekor qilish
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {!transactions.length && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                              To'lov tarixi yo'q
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
