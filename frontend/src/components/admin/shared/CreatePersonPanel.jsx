import { useState } from 'react';
import { Button, Card, Input, Select, Tabs } from '../../../components/ui';

export default function CreatePersonPanel({
  loading,
  subjects,
  classrooms,
  onCreateTeacher,
  onCreateStudent,
  mode = 'both',
}) {
  const [createTab, setCreateTab] = useState(mode === 'student' ? 'student' : 'teacher');
  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    yashashManzili: '',
    phone: '',
    subjectId: '',
  });
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    yashashManzili: '',
    classroomId: '',
    phone: '',
    parentPhone: '',
  });

  const selectedSubjectId = teacherForm.subjectId || subjects[0]?.id || '';
  const selectedClassroomId = studentForm.classroomId || classrooms[0]?.id || '';
  const effectiveCreateTab = mode === 'both' ? createTab : mode;

  async function handleTeacherSubmit(event) {
    event.preventDefault();
    const ok = await onCreateTeacher({ ...teacherForm, subjectId: selectedSubjectId });
    if (ok) {
      setTeacherForm({
        firstName: '',
        lastName: '',
        birthDate: '',
        yashashManzili: '',
        phone: '',
        subjectId: '',
      });
    }
  }

  async function handleStudentSubmit(event) {
    event.preventDefault();
    const ok = await onCreateStudent({ ...studentForm, classroomId: selectedClassroomId });
    if (ok) {
      setStudentForm({
        firstName: '',
        lastName: '',
        birthDate: '',
        yashashManzili: '',
        classroomId: '',
        phone: '',
        parentPhone: '',
      });
    }
  }

  return (
    <Card
      title="Qo'shish"
      actions={
        mode === 'both' ? (
          <Tabs
            value={createTab}
            onChange={setCreateTab}
            items={[
              { value: 'teacher', label: 'Add Teacher' },
              { value: 'student', label: 'Add Student' },
            ]}
          />
        ) : null
      }
    >
      {effectiveCreateTab === 'teacher' ? (
        <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            type="text"
            required
            value={teacherForm.firstName}
            onChange={(event) => setTeacherForm((prev) => ({ ...prev, firstName: event.target.value }))}
            placeholder="Ism"
          />
          <Input
            type="text"
            required
            value={teacherForm.lastName}
            onChange={(event) => setTeacherForm((prev) => ({ ...prev, lastName: event.target.value }))}
            placeholder="Familiya"
          />
          <Input
            type="date"
            required
            value={teacherForm.birthDate}
            onChange={(event) => setTeacherForm((prev) => ({ ...prev, birthDate: event.target.value }))}
          />
          <Input
            type="text"
            required
            value={teacherForm.yashashManzili}
            onChange={(event) => setTeacherForm((prev) => ({ ...prev, yashashManzili: event.target.value }))}
            placeholder="Yashash manzili"
            className="md:col-span-2"
          />
          <Input
            type="text"
            required
            value={teacherForm.phone}
            onChange={(event) => setTeacherForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Telefon"
          />
          <Select
            required
            value={selectedSubjectId}
            onChange={(event) => setTeacherForm((prev) => ({ ...prev, subjectId: event.target.value }))}
            className="md:col-span-2"
          >
            {!subjects.length && <option value="">Avval fan qo'shing</option>}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          <div className="md:col-span-1">
            <Button
              type="submit"
              variant="success"
              disabled={loading || !subjects.length}
              className="w-full"
            >
              {loading ? 'Saqlanmoqda...' : 'Teacher yaratish'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            type="text"
            required
            value={studentForm.firstName}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, firstName: event.target.value }))}
            placeholder="Ism"
          />
          <Input
            type="text"
            required
            value={studentForm.lastName}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, lastName: event.target.value }))}
            placeholder="Familiya"
          />
          <Input
            type="date"
            required
            value={studentForm.birthDate}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, birthDate: event.target.value }))}
          />
          <Input
            type="text"
            required
            value={studentForm.yashashManzili}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, yashashManzili: event.target.value }))}
            placeholder="Yashash manzili"
            className="md:col-span-2"
          />
          <Select
            required
            value={selectedClassroomId}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, classroomId: event.target.value }))}
            className="md:col-span-1"
          >
            {!classrooms.length && <option value="">Avval sinf qo'shing</option>}
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name} ({classroom.academicYear})
              </option>
            ))}
          </Select>
          <Input
            type="text"
            required
            value={studentForm.phone}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Telefon"
          />
          <Input
            type="text"
            required
            value={studentForm.parentPhone}
            onChange={(event) => setStudentForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
            placeholder="Ota-ona telefoni"
            className="md:col-span-2"
          />
          <div className="md:col-span-1">
            <Button
              type="submit"
              variant="success"
              disabled={loading || !classrooms.length}
              className="w-full"
            >
              {loading ? 'Saqlanmoqda...' : 'Student yaratish'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
