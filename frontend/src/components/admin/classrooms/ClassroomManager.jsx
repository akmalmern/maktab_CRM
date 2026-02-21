import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AutoTranslate from '../../AutoTranslate';
import { Badge, Button, Card, DataTable, Input, Modal, StateView } from '../../../components/ui';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export default function ClassroomManager({
  classrooms,
  loading,
  actionLoading,
  onCreateClassroom,
  onPreviewAnnualClassPromotion,
  onRunAnnualClassPromotion,
  onOpenStudentDetail,
  onDeleteStudent,
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
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

  useEffect(() => {
    setLocalClassrooms(classrooms);
  }, [classrooms]);

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onCreateClassroom({ name, academicYear });
    if (ok) setName('');
  }

  async function loadAnnualPreview() {
    setAnnualLoading(true);
    setAnnualError('');
    const result = await onPreviewAnnualClassPromotion?.();
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
    const yes = window.confirm(
      `${t("Yillik sinf yangilash bajarilsinmi?")} ${
        annualPreview ? t("Jami {{count}} o'quvchi sinfi yangilanadi.", { count: annualPreview.studentsToPromote || 0 }) : ''
      }`,
    );
    if (!yes) return;

    setAnnualLoading(true);
    setAnnualError('');
    const result = await onRunAnnualClassPromotion?.({ force: false });
    setAnnualLoading(false);
    if (!result?.ok) {
      setAnnualError(result?.message || t("Yillik o'tkazish bajarilmadi"));
      return;
    }
    await loadAnnualPreview();
    setAnnualModalOpen(false);
  }

  async function loadClassroomStudents({
    classroomId,
    page = 1,
    search = '',
  }) {
    if (!classroomId) return;
    setStudentLoading(true);
    setStudentError('');
    try {
      const data = await apiRequest({
        path: `/api/admin/classrooms/${classroomId}/students`,
        query: {
          page,
          limit: 20,
          search: search || undefined,
        },
      });
      setStudentRows(data.students || []);
      setStudentPage(data.page || 1);
      setStudentPages(data.pages || 1);
      setStudentTotal(data.total || 0);
    } catch (error) {
      setStudentRows([]);
      setStudentError(getErrorMessage(error));
    } finally {
      setStudentLoading(false);
    }
  }

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
  }, [openedClassroomId]);

  const studentColumns = [
    {
      key: 'fullName',
      header: 'F.I.SH',
      render: (student) => `${student.firstName} ${student.lastName}`,
    },
    {
      key: 'username',
      header: 'Username',
      render: (student) => student.user?.username || '-',
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (student) => student.user?.phone || '-',
    },
    {
      key: 'actions',
      header: 'Amallar',
      render: (student) => (
        <div className="flex gap-2">
          <Button size="sm" variant="indigo" onClick={() => onOpenStudentDetail(student.id)}>
            Batafsil
          </Button>
          <Button
            size="sm"
            variant="danger"
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
            O'chirish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AutoTranslate>
      <Card
      title={t('Sinflar boshqaruvi')}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{t('Jami')}: {localClassrooms.length}</span>
          <Button size="sm" variant="indigo" onClick={openAnnualModal} disabled={annualLoading || actionLoading}>
            {t("Yillik avtomat o'tkazish")}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Masalan: 6-A')}
        />
        <Input
          type="text"
          value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)}
          placeholder="Masalan: 2025-2026"
        />
        <Button type="submit" variant="success" disabled={actionLoading}>
          Qo'shish
        </Button>
      </form>

      {loading ? (
        <StateView type="loading" />
      ) : localClassrooms.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {localClassrooms.map((classroom) => (
            <div key={classroom.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-slate-900">{classroom.name}</p>
                  <p className="text-sm text-slate-500">{classroom.academicYear}</p>
                </div>
                <Badge variant="info">{t("{{count}} ta o'quvchi", { count: classroom.studentCount || 0 })}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setOpenedClassroomId(classroom.id)}>
                  {t("Ko'rish")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StateView type="empty" description="Sinflar mavjud emas" />
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
            className="flex gap-2"
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
            <Input
              type="text"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Ism, familiya, username yoki telefon"
            />
            <Button type="submit" variant="secondary" disabled={studentLoading}>
              Qidirish
            </Button>
          </form>

          {studentLoading ? <StateView type="loading" /> : null}
          {!studentLoading && studentError ? <StateView type="error" description={studentError} /> : null}
          {!studentLoading && !studentError && studentRows.length ? (
            <>
              <DataTable
                columns={studentColumns}
                rows={studentRows}
                stickyHeader
                maxHeightClassName="max-h-80"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {t('Jami')}: {studentTotal} {t('ta')} | {t('Sahifa')}: {studentPage} / {studentPages}
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
                    Oldingi
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
                    Keyingi
                  </Button>
                </div>
              </div>
            </>
          ) : null}
          {!studentLoading && !studentError && !studentRows.length ? (
            <StateView type="empty" description="Bu sinfda hozircha student yo'q." />
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p>
                <b>{annualPreview.sourceAcademicYear}</b> dan <b>{annualPreview.targetAcademicYear}</b> ga
              </p>
              <p className="mt-1">
                Yangilanadigan sinflar: <b>{annualPreview.promoteCount}</b>, bitiruvchi sinflar:{' '}
                <b>{annualPreview.graduateCount}</b>
              </p>
              <p className="mt-1">
                {t("O'quvchilar soni (yangilanadi):")} <b>{annualPreview.studentsToPromote}</b>
              </p>
              {!annualPreview.isSeptember && (
                <p className="mt-1 text-amber-700">
                  {t("Hozir sentyabr emas. Bu manual ishga tushirish bo'ladi.")}
                </p>
              )}
            </div>

            {annualPreview.conflictCount > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {t("Conflict mavjud: {{count}} ta. Avval mavjud sinflarni tekshiring.", { count: annualPreview.conflictCount })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={loadAnnualPreview} disabled={annualLoading}>
                {t("Preview yangilash")}
              </Button>
              <Button
                variant="success"
                onClick={handleRunAnnualPromotion}
                disabled={annualLoading || annualPreview.conflictCount > 0 || annualPreview.promoteCount === 0}
              >
                {t("Tasdiqlab avtomat o'tkazish")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      </Card>
    </AutoTranslate>
  );
}
