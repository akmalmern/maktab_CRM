import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Badge, Button, Card, DataTable, Input, Modal, Select, StateView } from '../../../components/ui';
import {
  useCreateClassroomMutation,
  useGetClassroomsMetaQuery,
  useGetClassroomsQuery,
  useLazyGetClassroomStudentsQuery,
  usePreviewAnnualClassPromotionMutation,
  useRunAnnualClassPromotionMutation,
} from '../../../services/api/classroomsApi';

function getAcademicYearByDate(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getNextAcademicYear(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return getAcademicYearByDate();
  const nextStart = Number.parseInt(match[1], 10) + 1;
  return `${nextStart}-${nextStart + 1}`;
}

function buildAcademicYearOptions(classrooms = []) {
  const current = getAcademicYearByDate();
  const [startRaw] = current.split('-');
  const start = Number.parseInt(startRaw, 10);
  const generated = Array.from({ length: 7 }, (_, index) => {
    const y = start - 3 + index;
    return `${y}-${y + 1}`;
  });
  return [...new Set([...generated, ...classrooms.map((item) => item.academicYear).filter(Boolean)])].sort(
    (a, b) => b.localeCompare(a),
  );
}

function normalizeClassroomName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const dashIndex = raw.indexOf('-');
  if (dashIndex < 0) return raw.replace(/\s{2,}/g, ' ');

  const gradeRaw = raw.slice(0, dashIndex).trim();
  const suffixRaw = raw.slice(dashIndex + 1).trim().replace(/\s{2,}/g, ' ');
  const grade = Number.parseInt(gradeRaw, 10);

  if (!Number.isFinite(grade)) return raw.replace(/\s{2,}/g, ' ');

  const suffix =
    suffixRaw.length === 1 ? suffixRaw.toUpperCase() : suffixRaw;

  return suffix ? `${grade}-${suffix}` : `${grade}-`;
}

function FieldLabel({ children }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

function StatChip({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white text-slate-700',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] || tones.default}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

export default function ClassroomManager({
  onOpenStudentDetail,
  onDeleteStudent,
}) {
  const { t } = useTranslation();
  const classroomsQuery = useGetClassroomsQuery();
  const classroomMetaQuery = useGetClassroomsMetaQuery();
  const [createClassroom, createClassroomState] = useCreateClassroomMutation();
  const [fetchClassroomStudents] = useLazyGetClassroomStudentsQuery();
  const [previewAnnualPromotion] = usePreviewAnnualClassPromotionMutation();
  const [runAnnualPromotion, runAnnualPromotionState] = useRunAnnualClassPromotionMutation();

  const classrooms = useMemo(() => classroomsQuery.data?.classrooms || [], [classroomsQuery.data]);
  const allowedAcademicYears = useMemo(
    () => classroomsQuery.data?.academicYears || [],
    [classroomsQuery.data],
  );
  const classroomMeta = classroomMetaQuery.data?.meta || null;
  const loading = classroomsQuery.isLoading || classroomsQuery.isFetching;
  const actionLoading = createClassroomState.isLoading || runAnnualPromotionState.isLoading;
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState(getAcademicYearByDate());
  const [localClassrooms, setLocalClassrooms] = useState(classrooms);
  const [openedClassroomId, setOpenedClassroomId] = useState(null);
  const [annualModalOpen, setAnnualModalOpen] = useState(false);
  const [annualPreview, setAnnualPreview] = useState(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [annualError, setAnnualError] = useState('');
  const [studentRows, setStudentRows] = useState([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPages, setStudentPages] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');
  const selectedClassroom = localClassrooms.find((item) => item.id === openedClassroomId) || null;
  const academicYearOptions = useMemo(() => {
    const localOptions = buildAcademicYearOptions(localClassrooms);
    const apiOptions = Array.isArray(allowedAcademicYears)
      ? allowedAcademicYears.filter(Boolean)
      : [];
    return [...new Set([...apiOptions, ...localOptions])].sort((a, b) => b.localeCompare(a));
  }, [allowedAcademicYears, localClassrooms]);

  useEffect(() => {
    if (!academicYearOptions.length) return;
    if (!academicYearOptions.includes(academicYear)) {
      setAcademicYear(academicYearOptions[0]);
    }
  }, [academicYear, academicYearOptions]);

  useEffect(() => {
    setLocalClassrooms(classrooms);
  }, [classrooms]);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedName = normalizeClassroomName(name);
    setName(normalizedName);
    try {
      await createClassroom({ name: normalizedName, academicYear }).unwrap();
      toast.success(t("Sinf qo`shildi"));
      setName('');
    } catch (error) {
      toast.error(error?.message || t("Sinf qo`shilmadi"));
    }
  }

  async function loadAnnualPreview() {
    setAnnualLoading(true);
    setAnnualError('');
    let result;
    try {
      const data = await previewAnnualPromotion().unwrap();
      result = { ok: true, data };
    } catch (error) {
      result = { ok: false, message: error?.message };
    }
      setAnnualLoading(false);
    if (!result?.ok) {
      setAnnualPreview(null);
      setAnnualError(result?.message || t("Yillik o'tkazish preview olinmadi"));
      return;
    }
    setAnnualPreview(result.data?.plan || null);
  }

  async function openAnnualModal() {
    setAnnualModalOpen(true);
    await loadAnnualPreview();
  }

  async function handleRunAnnualPromotion() {
    const studentsToPromote = annualPreview?.studentsToPromote || 0;
    const studentsToGraduate = annualPreview?.studentsToGraduate || 0;
    const yes = window.confirm(
      `${t("Yillik sinf yangilash bajarilsinmi?")} ${
        annualPreview
          ? `${t("Yangilanadigan o'quvchilar")}: ${studentsToPromote}. ${t('Bitiruvchilar')}: ${studentsToGraduate}.`
          : ''
      }`,
    );
    if (!yes) return;

    setAnnualLoading(true);
    setAnnualError('');
    let result;
    try {
      const data = await runAnnualPromotion({ force: false }).unwrap();
      result = { ok: true, data };
      toast.success(data?.message || t("Yillik sinf o'tkazish bajarildi"));
    } catch (error) {
      result = { ok: false, message: error?.message };
    }
    setAnnualLoading(false);
    if (!result?.ok) {
      setAnnualError(result?.message || t("Yillik o'tkazish bajarilmadi"));
      return;
    }
    await loadAnnualPreview();
    setAnnualModalOpen(false);
  }

  const loadClassroomStudents = useCallback(async ({
    classroomId,
    page = 1,
    search = '',
  }) => {
    if (!classroomId) return;
    setStudentLoading(true);
    setStudentError('');
    try {
      const data = await fetchClassroomStudents({
        classroomId,
        page,
        limit: 20,
        search,
      }).unwrap();
      setStudentRows(data.students || []);
      setStudentPage(data.page || 1);
      setStudentPages(data.pages || 1);
      setStudentTotal(data.total || 0);
    } catch (error) {
      setStudentRows([]);
      setStudentError(error?.message || t("Sinf o'quvchilari olinmadi"));
    } finally {
      setStudentLoading(false);
    }
  }, [fetchClassroomStudents, t]);

  useEffect(() => {
    if (!openedClassroomId) {
      setStudentRows([]);
      setStudentPage(1);
      setStudentPages(1);
      setStudentTotal(0);
      setStudentSearch('');
      setStudentError('');
      return;
    }

    setStudentSearch('');
    loadClassroomStudents({ classroomId: openedClassroomId, page: 1, search: '' });
  }, [openedClassroomId, loadClassroomStudents]);

  const studentColumns = [
    {
      key: 'fullName',
      header: t('F.I.SH'),
      render: (student) => `${student.firstName} ${student.lastName}`,
    },
    {
      key: 'username',
      header: t('Username'),
      render: (student) => student.user?.username || '-',
    },
    {
      key: 'phone',
      header: t('Telefon'),
      render: (student) => student.user?.phone || '-',
    },
    {
      key: 'actions',
      header: t('Amallar'),
      render: (student) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="indigo"
            className="min-w-24"
            onClick={() => onOpenStudentDetail(student.id)}
          >
            {t('Batafsil')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="min-w-24"
            onClick={async () => {
              const ok = await onDeleteStudent(student.id);
              if (ok && selectedClassroom?.id) {
                await loadClassroomStudents({
                  classroomId: selectedClassroom.id,
                  page: 1,
                  search: studentSearch,
                });
              }
            }}
          >
            {t("O'chirish")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={t('Sinflar boshqaruvi')}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="info">{t('Jami')}: {localClassrooms.length}</Badge>
          <Button
            size="sm"
            variant="indigo"
            onClick={openAnnualModal}
            disabled={annualLoading || actionLoading}
          >
            {t("Yillik avtomat o'tkazish")}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1.5 md:col-span-1">
          <label className="block">
            <FieldLabel>{t('Sinf nomi')}</FieldLabel>
          <Input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={(event) => setName(normalizeClassroomName(event.target.value))}
            placeholder={t('Masalan: 6-A yoki 10-FizMat')}
          />
          </label>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="block">
            <FieldLabel>{t("O'quv yili")}</FieldLabel>
          <Select
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
          >
            {academicYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          </label>
          {(classroomMeta?.currentAcademicYear || classroomMeta?.nextAcademicYear) && (
            <div className="flex flex-wrap items-center gap-2">
              {classroomMeta?.currentAcademicYear ? (
                <Badge>{t('Joriy')}: {classroomMeta.currentAcademicYear}</Badge>
              ) : null}
              {classroomMeta?.nextAcademicYear ? (
                <Badge variant="info">{t('Keyingi')}: {classroomMeta.nextAcademicYear}</Badge>
              ) : null}
            </div>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-1">
          <label className="block">
            <FieldLabel>{t('Tez amal')}</FieldLabel>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setAcademicYear(
                classroomMeta?.nextAcademicYear || getNextAcademicYear(academicYear),
              )
            }
            disabled={actionLoading}
            className="w-full"
          >
            {t("Kelasi o'quv yili")}
          </Button>
          </label>
        </div>
        <div className="md:col-span-4 flex justify-end">
          <Button type="submit" variant="success" disabled={actionLoading} className="w-full md:w-auto md:min-w-40">
            {t("Qo'shish")}
          </Button>
        </div>
        </div>
      </form>

      {loading ? (
        <StateView type="loading" />
      ) : classroomsQuery.error ? (
        <StateView type="error" description={classroomsQuery.error?.message || t('Sinflar olinmadi')} />
      ) : localClassrooms.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {localClassrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="group rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/60 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-900">{classroom.name}</p>
                  <p className="text-sm text-slate-500">{classroom.academicYear}</p>
                </div>
                <Badge variant="info">{t("{{count}} ta o'quvchi", { count: classroom.studentCount || 0 })}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{t('Boshqaruv')}</span>
                <Button size="sm" variant="secondary" onClick={() => setOpenedClassroomId(classroom.id)}>
                  {t("Ko'rish")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StateView type="empty" description={t('Sinflar mavjud emas')} />
      )}

      <Modal
        open={Boolean(selectedClassroom)}
        onClose={() => setOpenedClassroomId(null)}
        title={
          selectedClassroom
            ? `${selectedClassroom.name} (${selectedClassroom.academicYear})`
            : t("Sinf o'quvchilari")
        }
        subtitle={selectedClassroom ? t("O'quvchilar soni: {{count}} ta", { count: selectedClassroom.studentCount || 0 }) : null}
      >
        <div className="space-y-3">
          <form
            className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedClassroom?.id) return;
              loadClassroomStudents({
                classroomId: selectedClassroom.id,
                page: 1,
                search: studentSearch,
              });
            }}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <FieldLabel>{t("O'quvchi qidiruvi")}</FieldLabel>
                <Input
                  type="text"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder={t('Ism, familiya, username yoki telefon')}
                />
              </div>
              <div className="sm:self-end">
                <Button type="submit" variant="secondary" disabled={studentLoading} className="w-full sm:w-auto">
                  {t('Qidirish')}
                </Button>
              </div>
            </div>
          </form>

          {studentLoading ? <StateView type="loading" /> : null}
          {!studentLoading && studentError ? <StateView type="error" description={studentError} /> : null}
          {!studentLoading && !studentError && studentRows.length ? (
            <>
              <DataTable
                columns={studentColumns}
                rows={studentRows}
                stickyHeader
                stickyFirstColumn
                maxHeightClassName="max-h-80"
              />
              <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 sm:flex-row sm:items-center">
                <span className="text-xs text-slate-600">
                  {t('Jami')}: <b className="text-slate-900">{studentTotal}</b> {t('ta')} | {t('Sahifa')}:{' '}
                  <b className="text-slate-900">{studentPage}</b> / {studentPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={studentLoading || studentPage <= 1}
                    onClick={() =>
                      loadClassroomStudents({
                        classroomId: selectedClassroom.id,
                        page: Math.max(1, studentPage - 1),
                        search: studentSearch,
                      })
                    }
                  >
                    {t('Oldingi')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={studentLoading || studentPage >= studentPages}
                    onClick={() =>
                      loadClassroomStudents({
                        classroomId: selectedClassroom.id,
                        page: Math.min(studentPages, studentPage + 1),
                        search: studentSearch,
                      })
                    }
                  >
                    {t('Keyingi')}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
          {!studentLoading && !studentError && !studentRows.length ? (
            <StateView type="empty" description={t("Bu sinfda hozircha student yo'q.")} />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={annualModalOpen}
        onClose={() => setAnnualModalOpen(false)}
        title={t("Yillik sinf yangilash (Sentyabr)")}
        subtitle={t("Tarix saqlanadi: eski sinflar arxivlanadi, o'quvchilar yangi o'quv yilidagi sinflarga ko'chiriladi.")}
      >
        {annualLoading && <StateView type="loading" />}
        {!annualLoading && annualError && <StateView type="error" description={annualError} />}
        {!annualLoading && !annualError && annualPreview && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50">
              <p className="text-sm font-medium text-slate-800">
                {t('{{from}} dan {{to}} ga', {
                  from: annualPreview.sourceAcademicYear,
                  to: annualPreview.targetAcademicYear,
                })}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <StatChip
                  label={t('Yangilanadigan sinflar')}
                  value={annualPreview.promoteCount || 0}
                  tone="info"
                />
                <StatChip
                  label={t('Bitiruvchi sinflar')}
                  value={annualPreview.graduateCount || 0}
                  tone="warning"
                />
                <StatChip
                  label={t("Yangilanadigan o'quvchilar")}
                  value={annualPreview.studentsToPromote || 0}
                  tone="success"
                />
                <StatChip
                  label={t('Bitiruvchi o\'quvchilar')}
                  value={annualPreview.studentsToGraduate || 0}
                  tone="default"
                />
              </div>
              {!annualPreview.isSeptember && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default" className="border-amber-200 bg-amber-100 text-amber-800 shadow-none">
                      {t('Ogohlantirish')}
                    </Badge>
                    <span>{t("Hozir sentyabr emas. Bu manual ishga tushirish bo'ladi.")}</span>
                  </div>
                </div>
              )}
            </div>

            {annualPreview.conflictCount > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="danger" className="shadow-none">
                    {t('Conflict')}: {annualPreview.conflictCount}
                  </Badge>
                  <span>
                    {t("Conflict mavjud: {{count}} ta. Avval mavjud sinflarni tekshiring.", { count: annualPreview.conflictCount })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-200/80 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button variant="secondary" onClick={loadAnnualPreview} disabled={annualLoading}>
                {t("Preview yangilash")}
              </Button>
              <Button
                variant="success"
                onClick={handleRunAnnualPromotion}
                disabled={
                  annualLoading ||
                  annualPreview.conflictCount > 0 ||
                  ((annualPreview.promoteCount || 0) === 0 && (annualPreview.graduateCount || 0) === 0)
                }
              >
                {t("Tasdiqlab avtomat o'tkazish")}
              </Button>
              <span className="text-xs text-slate-500">
                {t('Faqat preview tekshirilib tasdiqlangandan keyin ishga tushiring')}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
