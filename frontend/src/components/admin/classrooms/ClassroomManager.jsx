import { useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Input, Modal, StateView } from '../../../components/ui';

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
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [localClassrooms, setLocalClassrooms] = useState(classrooms);
  const [openedClassroomId, setOpenedClassroomId] = useState(null);
  const [annualModalOpen, setAnnualModalOpen] = useState(false);
  const [annualPreview, setAnnualPreview] = useState(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [annualError, setAnnualError] = useState('');
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
      setAnnualError(result?.message || "Yillik o'tkazish preview olinmadi");
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
      `Yillik sinf yangilash bajarilsinmi? ${
        annualPreview ? `Jami ${annualPreview.studentsToPromote || 0} o'quvchi sinfi yangilanadi.` : ''
      }`,
    );
    if (!yes) return;

    setAnnualLoading(true);
    setAnnualError('');
    const result = await onRunAnnualClassPromotion?.({ force: false });
    setAnnualLoading(false);
    if (!result?.ok) {
      setAnnualError(result?.message || "Yillik o'tkazish bajarilmadi");
      return;
    }
    await loadAnnualPreview();
    setAnnualModalOpen(false);
  }

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
              if (ok) setOpenedClassroomId(null);
            }}
          >
            O'chirish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title="Sinflar boshqaruvi"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Jami: {localClassrooms.length}</span>
          <Button size="sm" variant="indigo" onClick={openAnnualModal} disabled={annualLoading || actionLoading}>
            Yillik avtomat o'tkazish
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Masalan: 6-A"
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
                <Badge variant="info">{classroom.studentCount || 0} ta o'quvchi</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setOpenedClassroomId(classroom.id)}>
                  Ko'rish
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
            : "Sinf o'quvchilari"
        }
        subtitle={selectedClassroom ? `O'quvchilar soni: ${selectedClassroom.studentCount || 0} ta` : null}
      >
        {selectedClassroom?.students?.length ? (
          <DataTable
            columns={studentColumns}
            rows={selectedClassroom.students}
            stickyHeader
            maxHeightClassName="max-h-80"
          />
        ) : (
          <StateView type="empty" description="Bu sinfda hozircha student yo'q." />
        )}
      </Modal>

      <Modal
        open={annualModalOpen}
        onClose={() => setAnnualModalOpen(false)}
        title="Yillik sinf yangilash (Sentyabr)"
        subtitle="O'quvchilar ko'chirilmaydi: sinf nomi va o'quv yili avtomatik yangilanadi."
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
                O'quvchilar soni (yangilanadi): <b>{annualPreview.studentsToPromote}</b>
              </p>
              {!annualPreview.isSeptember && (
                <p className="mt-1 text-amber-700">
                  Hozir sentyabr emas. Bu manual ishga tushirish bo'ladi.
                </p>
              )}
            </div>

            {annualPreview.conflictCount > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Conflict mavjud: {annualPreview.conflictCount} ta. Avval mavjud sinflarni tekshiring.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={loadAnnualPreview} disabled={annualLoading}>
                Preview yangilash
              </Button>
              <Button
                variant="success"
                onClick={handleRunAnnualPromotion}
                disabled={annualLoading || annualPreview.conflictCount > 0 || annualPreview.promoteCount === 0}
              >
                Tasdiqlab avtomat o'tkazish
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

