import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Select, Tabs } from '../../../components/ui';

function Field({ label, children, className = '' }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function CreatePersonPanel({
  loading,
  subjects,
  classrooms,
  onCreateTeacher,
  onCreateStudent,
  mode = 'both',
}) {
  const { t } = useTranslation();
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
      title={t("Qo'shish")}
      actions={
        mode === 'both' ? (
          <Tabs
            value={createTab}
            onChange={setCreateTab}
            items={[
              { value: 'teacher', label: t('Add Teacher') },
              { value: 'student', label: t('Add Student') },
            ]}
          />
        ) : null
      }
    >
      {effectiveCreateTab === 'teacher' ? (
        <form onSubmit={handleTeacherSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label={t('Ism')}>
              <Input
                type="text"
                required
                value={teacherForm.firstName}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, firstName: event.target.value }))}
                placeholder={t('Ism')}
              />
            </Field>
            <Field label={t('Familiya')}>
              <Input
                type="text"
                required
                value={teacherForm.lastName}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, lastName: event.target.value }))}
                placeholder={t('Familiya')}
              />
            </Field>
            <Field label={t("Tug'ilgan sana")}>
              <Input
                type="date"
                required
                value={teacherForm.birthDate}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, birthDate: event.target.value }))}
              />
            </Field>
            <Field label={t('Yashash manzili')} className="md:col-span-2">
              <Input
                type="text"
                required
                value={teacherForm.yashashManzili}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, yashashManzili: event.target.value }))}
                placeholder={t('Yashash manzili')}
              />
            </Field>
            <Field label={t('Telefon')}>
              <Input
                type="text"
                required
                value={teacherForm.phone}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder={t('Telefon')}
              />
            </Field>
            <Field label={t('Fan')} className="md:col-span-2">
              <Select
                required
                value={selectedSubjectId}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, subjectId: event.target.value }))}
              >
                {!subjects.length && <option value="">{t("Avval fan qo'shing")}</option>}
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {t(subject.name, { defaultValue: subject.name })}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
              <p className="text-sm text-slate-600">
                {t("Teacher ma'lumotlari saqlanadi va profil sahifasiga o'tish mumkin bo'ladi")}
              </p>
              <div className="w-full max-w-xs md:w-auto">
                <Button
                  type="submit"
                  variant="success"
                  disabled={loading || !subjects.length}
                  className="w-full"
                >
                  {loading ? t('Saqlanmoqda...') : t('Teacher yaratish')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label={t('Ism')}>
              <Input
                type="text"
                required
                value={studentForm.firstName}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, firstName: event.target.value }))}
                placeholder={t('Ism')}
              />
            </Field>
            <Field label={t('Familiya')}>
              <Input
                type="text"
                required
                value={studentForm.lastName}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, lastName: event.target.value }))}
                placeholder={t('Familiya')}
              />
            </Field>
            <Field label={t("Tug'ilgan sana")}>
              <Input
                type="date"
                required
                value={studentForm.birthDate}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, birthDate: event.target.value }))}
              />
            </Field>
            <Field label={t('Yashash manzili')} className="md:col-span-2">
              <Input
                type="text"
                required
                value={studentForm.yashashManzili}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, yashashManzili: event.target.value }))}
                placeholder={t('Yashash manzili')}
              />
            </Field>
            <Field label={t('Sinf')}>
              <Select
                required
                value={selectedClassroomId}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, classroomId: event.target.value }))}
              >
                {!classrooms.length && <option value="">{t("Avval sinf qo'shing")}</option>}
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.academicYear})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Telefon')}>
              <Input
                type="text"
                required
                value={studentForm.phone}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder={t('Telefon')}
              />
            </Field>
            <Field label={t('Ota-ona telefoni')} className="md:col-span-2">
              <Input
                type="text"
                required
                value={studentForm.parentPhone}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
                placeholder={t('Ota-ona telefoni')}
              />
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
              <p className="text-sm text-slate-600">
                {t("Student yaratilgach, profil sahifasidan hujjat yuklashni davom ettirish mumkin")}
              </p>
              <div className="w-full max-w-xs md:w-auto">
                <Button
                  type="submit"
                  variant="success"
                  disabled={loading || !classrooms.length}
                  className="w-full"
                >
                  {loading ? t('Saqlanmoqda...') : t('Student yaratish')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
