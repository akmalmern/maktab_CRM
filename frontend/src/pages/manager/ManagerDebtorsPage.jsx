import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Card, Input, Modal, Select, StateView, Textarea } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

const SEARCH_DEBOUNCE_MS = 400;
const NOTES_PAGE_LIMIT = 10;

function sumFormat(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/,/g, ' ');
}

function formatMoney(value) {
  return `${sumFormat(value)} so'm`;
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('uz-UZ');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('uz-UZ');
}

function MonthChips({ items = [] }) {
  if (!items.length) return <span className="text-slate-400">-</span>;
  const visible = items.slice(0, 3);
  const hiddenCount = Math.max(0, items.length - 3);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <span key={item} className="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
          {item}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

export default function ManagerDebtorsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [query, setQuery] = useState({
    search: '',
    classroomId: 'all',
    page: 1,
    limit: 20,
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [studentsState, setStudentsState] = useState({
    loading: true,
    error: '',
    items: [],
    total: 0,
    pages: 0,
    summary: {
      totalDebtors: 0,
      totalDebtAmount: 0,
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [noteForm, setNoteForm] = useState({ izoh: '', promisedPayDate: '' });
  const [notesState, setNotesState] = useState({
    loading: false,
    error: '',
    items: [],
    page: 1,
    pages: 0,
    total: 0,
  });
  const [savingNote, setSavingNote] = useState(false);
  const [quickPayLoadingId, setQuickPayLoadingId] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentState, setPaymentState] = useState({
    loading: false,
    error: '',
    student: null,
    transactions: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(query.search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query.search]);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const data = await apiRequest({ path: '/api/manager/sinflar' });
        if (!active) return;
        setClassrooms(data.classrooms || []);
      } catch (error) {
        if (!active) return;
        toast.error(getErrorMessage(error));
      }
    }
    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function run() {
      setStudentsState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await apiRequest({
          path: '/api/manager/qarzdorlar',
          query: {
            page: query.page,
            limit: query.limit,
            search: debouncedSearch || undefined,
            classroomId: query.classroomId === 'all' ? undefined : query.classroomId,
          },
        });
        if (!active) return;
        setStudentsState({
          loading: false,
          error: '',
          items: data.students || [],
          total: data.total || 0,
          pages: data.pages || 0,
          summary: data.summary || {
            totalDebtors: 0,
            totalDebtAmount: 0,
          },
        });
      } catch (error) {
        if (!active) return;
        setStudentsState((prev) => ({
          ...prev,
          loading: false,
          error: getErrorMessage(error),
        }));
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [query.page, query.limit, query.classroomId, debouncedSearch, refreshTick]);

  const summaryCards = useMemo(
    () => [
      { label: 'Jami qarzdorlar', value: Number(studentsState.summary?.totalDebtors || 0) },
      { label: "Jami qarz summasi", value: formatMoney(studentsState.summary?.totalDebtAmount || 0) },
      { label: 'Sahifa', value: `${query.page} / ${studentsState.pages || 1}` },
    ],
    [studentsState.summary, studentsState.pages, query.page],
  );

  async function reloadDebtors() {
    setRefreshTick((prev) => prev + 1);
  }

  async function loadNotes(studentId, page = 1) {
    setNotesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await apiRequest({
        path: `/api/manager/qarzdorlar/${studentId}/izohlar`,
        query: { page, limit: NOTES_PAGE_LIMIT },
      });
      setNotesState({
        loading: false,
        error: '',
        items: data.notes || [],
        page: data.page || 1,
        pages: data.pages || 0,
        total: data.total || 0,
      });
    } catch (error) {
      setNotesState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }

  async function openModal(student) {
    setSelectedStudent(student);
    setNoteForm({ izoh: '', promisedPayDate: '' });
    setModalOpen(true);
    await loadNotes(student.id, 1);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedStudent(null);
    setNotesState({
      loading: false,
      error: '',
      items: [],
      page: 1,
      pages: 0,
      total: 0,
    });
    setNoteForm({ izoh: '', promisedPayDate: '' });
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    if (!selectedStudent) return;
    const izoh = noteForm.izoh.trim();
    if (!izoh) {
      toast.warning("Izoh maydoni bo'sh bo'lishi mumkin emas");
      return;
    }

    setSavingNote(true);
    try {
      await apiRequest({
        path: `/api/manager/qarzdorlar/${selectedStudent.id}/izohlar`,
        method: 'POST',
        body: {
          izoh,
          promisedPayDate: noteForm.promisedPayDate || undefined,
        },
      });
      toast.success("Izoh saqlandi");
      setNoteForm({ izoh: '', promisedPayDate: '' });
      await Promise.all([loadNotes(selectedStudent.id, 1), reloadDebtors()]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingNote(false);
    }
  }

  function firstDebtMonth(row) {
    return row?.qarzOylar?.[0] || currentMonthKey();
  }

  async function loadPaymentDetail(studentId) {
    setPaymentState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await apiRequest({
        path: `/api/manager/tolov/students/${studentId}`,
      });
      setPaymentState({
        loading: false,
        error: '',
        student: data.student || null,
        transactions: data.transactions || [],
      });
    } catch (error) {
      setPaymentState({
        loading: false,
        error: getErrorMessage(error),
        student: null,
        transactions: [],
      });
    }
  }

  async function openPaymentHistory(row) {
    setPaymentStudent(row);
    setPaymentModalOpen(true);
    await loadPaymentDetail(row.id);
  }

  function closePaymentModal() {
    setPaymentModalOpen(false);
    setPaymentStudent(null);
    setPaymentState({
      loading: false,
      error: '',
      student: null,
      transactions: [],
    });
  }

  async function handleQuickPay(row, mode) {
    if (!row?.id) return;

    const oylarSoni =
      mode === 'ALL'
        ? Math.max(1, Number(row.qarzOylarSoni || 1))
        : 1;

    setQuickPayLoadingId(row.id + mode);
    try {
      await apiRequest({
        path: `/api/manager/tolov/students/${row.id}`,
        method: 'POST',
        body: {
          turi: 'OYLIK',
          startMonth: firstDebtMonth(row),
          oylarSoni,
        },
      });
      toast.success(mode === 'ALL' ? "Qarz to'liq yopildi" : "1 oy to'landi");
      await reloadDebtors();
      if (paymentModalOpen && paymentStudent?.id === row.id) {
        await loadPaymentDetail(row.id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setQuickPayLoadingId('');
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Qarzdorlar ro'yxati"
        subtitle="Menejer faqat qarzdor o'quvchilar bilan ishlaydi va ota-ona bilan aloqa izohini yozadi."
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="text-lg font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input
            type="text"
            value={query.search}
            onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            placeholder="Ism, username yoki ota-ona telefoni..."
          />
          <Select
            value={query.classroomId}
            onChange={(e) => setQuery((prev) => ({ ...prev, classroomId: e.target.value, page: 1 }))}
          >
            <option value="all">Barcha sinflar</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name} ({classroom.academicYear})
              </option>
            ))}
          </Select>
          <Select
            value={String(query.limit)}
            onChange={(e) => setQuery((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} ta / sahifa
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={reloadDebtors}>
            Yangilash
          </Button>
        </div>

        <div className="mt-3">
          {studentsState.loading && <StateView type="loading" />}
          {!studentsState.loading && studentsState.error && (
            <StateView type="error" description={studentsState.error} />
          )}
          {!studentsState.loading && !studentsState.error && !studentsState.items.length && (
            <StateView type="empty" description="Qarzdor o'quvchi topilmadi." />
          )}

          {!studentsState.loading && !studentsState.error && studentsState.items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">O'quvchi</th>
                    <th className="px-3 py-2">Sinf</th>
                    <th className="px-3 py-2">Ota-ona telefoni</th>
                    <th className="px-3 py-2">Qarz oylar</th>
                    <th className="px-3 py-2">Jami qarz</th>
                    <th className="px-3 py-2">Oxirgi izoh</th>
                    <th className="px-3 py-2">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsState.items.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">@{row.username}</p>
                      </td>
                      <td className="px-3 py-2">{row.classroom}</td>
                      <td className="px-3 py-2">
                        {row.parentPhone && row.parentPhone !== '-' ? (
                          <a
                            href={`tel:${row.parentPhone}`}
                            className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
                          >
                            {row.parentPhone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <p className="mb-1 font-semibold text-rose-700">{row.qarzOylarSoni} ta</p>
                        <MonthChips items={row.qarzOylarFormatted || []} />
                      </td>
                      <td className="px-3 py-2 font-semibold text-rose-700">
                        {formatMoney(row.jamiQarzSumma)}
                      </td>
                      <td className="px-3 py-2">
                        {row.oxirgiIzoh ? (
                          <div>
                            <p className="max-w-[260px] text-slate-700">{row.oxirgiIzoh.izoh}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(row.oxirgiIzoh.createdAt)} | {row.oxirgiIzoh.manager?.fullName || '-'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Izoh yo'q</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleQuickPay(row, 'ONE')}
                            disabled={quickPayLoadingId === row.id + 'ONE' || quickPayLoadingId === row.id + 'ALL'}
                          >
                            1 oy to'lash
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickPay(row, 'ALL')}
                            disabled={quickPayLoadingId === row.id + 'ONE' || quickPayLoadingId === row.id + 'ALL'}
                          >
                            Qarzni yopish
                          </Button>
                          <Button size="sm" variant="indigo" onClick={() => openPaymentHistory(row)}>
                            Tarix
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openModal(row)}>
                            Izohlar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={query.page <= 1}
          >
            Oldingi
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setQuery((prev) => ({
                ...prev,
                page: Math.min(studentsState.pages || 1, prev.page + 1),
              }))
            }
            disabled={query.page >= (studentsState.pages || 1)}
          >
            Keyingi
          </Button>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title="Ota-ona bilan aloqa izohlari" maxWidth="max-w-4xl">
        {!selectedStudent ? (
          <StateView type="empty" description="O'quvchi tanlanmagan." />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{selectedStudent.fullName}</p>
              <p className="mt-1 text-slate-600">Sinf: {selectedStudent.classroom}</p>
              <p className="text-slate-600">
                Ota-ona telefoni:{' '}
                {selectedStudent.parentPhone && selectedStudent.parentPhone !== '-' ? (
                  <a
                    href={`tel:${selectedStudent.parentPhone}`}
                    className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
                  >
                    {selectedStudent.parentPhone}
                  </a>
                ) : (
                  '-'
                )}
              </p>
              <p className="mt-1 text-rose-700">
                Qarz: <b>{selectedStudent.qarzOylarSoni}</b> oy /{' '}
                <b>{formatMoney(selectedStudent.jamiQarzSumma)}</b>
              </p>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Yangi izoh qo'shish</p>
              <Textarea
                rows={3}
                value={noteForm.izoh}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, izoh: e.target.value }))}
                placeholder="Masalan: Ota-onasi bilan gaplashildi, keyingi haftada to'lov qilishini aytdi."
                required
              />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input
                  type="date"
                  value={noteForm.promisedPayDate}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, promisedPayDate: e.target.value }))}
                />
                <Button type="submit" variant="success" disabled={savingNote}>
                  {savingNote ? 'Saqlanmoqda...' : 'Izohni saqlash'}
                </Button>
              </div>
            </form>

            <Card title={`Izohlar tarixi (${notesState.total})`}>
              {notesState.loading && <StateView type="loading" />}
              {!notesState.loading && notesState.error && (
                <StateView type="error" description={notesState.error} />
              )}
              {!notesState.loading && !notesState.error && !notesState.items.length && (
                <StateView type="empty" description="Hali izoh kiritilmagan." />
              )}
              {!notesState.loading && !notesState.error && notesState.items.length > 0 && (
                <div className="space-y-2">
                  {notesState.items.map((note) => (
                    <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="text-slate-800">{note.izoh}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Yozilgan vaqt: {formatDateTime(note.createdAt)}</span>
                        <span>Manager: {note.manager?.fullName || note.manager?.username || '-'}</span>
                        <span>Va'da qilingan sana: {formatDate(note.promisedPayDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => loadNotes(selectedStudent.id, Math.max(1, notesState.page - 1))}
                  disabled={notesState.page <= 1 || notesState.loading}
                >
                  Oldingi
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    loadNotes(
                      selectedStudent.id,
                      Math.min(notesState.pages || 1, notesState.page + 1),
                    )
                  }
                  disabled={notesState.page >= (notesState.pages || 1) || notesState.loading}
                >
                  Keyingi
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      <Modal open={paymentModalOpen} onClose={closePaymentModal} title="To'lovlar tarixi" maxWidth="max-w-4xl">
        {!paymentStudent ? (
          <StateView type="empty" description="O'quvchi tanlanmagan." />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{paymentStudent.fullName}</p>
              <p className="mt-1 text-slate-600">Sinf: {paymentStudent.classroom}</p>
              <p className="text-slate-600">
                Qarz: <b>{paymentStudent.qarzOylarSoni}</b> oy / <b>{formatMoney(paymentStudent.jamiQarzSumma)}</b>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="success"
                onClick={() => handleQuickPay(paymentStudent, 'ONE')}
                disabled={quickPayLoadingId === paymentStudent.id + 'ONE' || quickPayLoadingId === paymentStudent.id + 'ALL'}
              >
                1 oy to'lash
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleQuickPay(paymentStudent, 'ALL')}
                disabled={quickPayLoadingId === paymentStudent.id + 'ONE' || quickPayLoadingId === paymentStudent.id + 'ALL'}
              >
                Qarzni yopish
              </Button>
            </div>

            <Card title="To'lov tranzaksiyalari">
              {paymentState.loading && <StateView type="loading" />}
              {!paymentState.loading && paymentState.error && (
                <StateView type="error" description={paymentState.error} />
              )}
              {!paymentState.loading && !paymentState.error && !paymentState.transactions.length && (
                <StateView type="empty" description="To'lov tarixi yo'q." />
              )}
              {!paymentState.loading && !paymentState.error && paymentState.transactions.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Sana</th>
                        <th className="px-3 py-2">Turi</th>
                        <th className="px-3 py-2">Holat</th>
                        <th className="px-3 py-2">Summa</th>
                        <th className="px-3 py-2">Qoplangan oylar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentState.transactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{formatDateTime(tx.tolovSana)}</td>
                          <td className="px-3 py-2">{tx.turi}</td>
                          <td className="px-3 py-2">
                            {tx.holat === 'BEKOR_QILINGAN' ? (
                              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                Bekor qilingan
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Aktiv
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(tx.summa)}</td>
                          <td className="px-3 py-2">
                            {(tx.qoplanganOylarFormatted || []).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
