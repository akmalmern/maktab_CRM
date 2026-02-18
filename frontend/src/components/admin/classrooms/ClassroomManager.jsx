import { useEffect, useState } from 'react';
import { Badge, Button, Card, DataTable, Input, Modal, StateView } from '../../../components/ui';

export default function ClassroomManager({
  classrooms,
  loading,
  actionLoading,
  onCreateClassroom,
  onDeleteClassroom,
  onOpenStudentDetail,
  onDeleteStudent,
}) {
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [localClassrooms, setLocalClassrooms] = useState(classrooms);
  const [openedClassroomId, setOpenedClassroomId] = useState(null);
  const selectedClassroom = localClassrooms.find((item) => item.id === openedClassroomId) || null;

  useEffect(() => {
    setLocalClassrooms(classrooms);
  }, [classrooms]);

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onCreateClassroom({ name, academicYear });
    if (ok) setName('');
  }

  async function handleDeleteClassroomOptimistic(classroomId) {
    const snapshot = localClassrooms;
    setLocalClassrooms((prev) => prev.filter((item) => item.id !== classroomId));
    if (openedClassroomId === classroomId) setOpenedClassroomId(null);

    const ok = await onDeleteClassroom(classroomId);
    if (!ok) setLocalClassrooms(snapshot);
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
      actions={<span className="text-sm text-slate-500">Jami: {localClassrooms.length}</span>}
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
                <Button
                  size="sm"
                  variant="danger"
                  disabled={actionLoading}
                  onClick={() => handleDeleteClassroomOptimistic(classroom.id)}
                >
                  O'chirish
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
    </Card>
  );
}
