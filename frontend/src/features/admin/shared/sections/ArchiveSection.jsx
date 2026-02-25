import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AutoTranslate from '../../../../components/AutoTranslate';
import { Button, Card, Input, Modal } from '../../../../components/ui';
import { PersonTable } from '../../../../components/admin';
import {
  useGetStudentsQuery,
  useGetTeachersQuery,
  useRestoreStudentMutation,
  useRestoreTeacherMutation,
} from '../../../../services/api/peopleApi';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};

const PHONE_PATTERN = /^[+\d][\d\s\-()]+$/;

function RestorePersonModal({
  t,
  open,
  type,
  values,
  errors,
  loading,
  onClose,
  onChange,
  onSubmit,
}) {
  const typeLabel = type === 'teacher'
    ? t('Teacher', { defaultValue: 'Teacher' })
    : t('Student', { defaultValue: 'Student' });

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('Tiklash', { defaultValue: 'Tiklash' })}
      subtitle={t("Arxivdagi foydalanuvchini qayta aktiv qiling. Username/telefon ixtiyoriy.", {
        defaultValue: "Arxivdagi foydalanuvchini qayta aktiv qiling. Username/telefon ixtiyoriy.",
      })}
      maxWidth="max-w-lg"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {t('{{type}} tiklanadi', {
            type: typeLabel,
            defaultValue: `${typeLabel} tiklanadi`,
          })}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="restore-new-username" className="text-sm font-medium text-slate-700">
            {t('Yangi username (ixtiyoriy)', { defaultValue: 'Yangi username (ixtiyoriy)' })}
          </label>
          <Input
            id="restore-new-username"
            value={values.newUsername}
            onChange={(e) => onChange('newUsername', e.target.value)}
            placeholder={t("Bo'sh qoldirsangiz o'zgarmaydi", {
              defaultValue: "Bo'sh qoldirsangiz o'zgarmaydi",
            })}
            autoComplete="off"
            disabled={loading}
          />
          {errors.newUsername && (
            <p className="text-xs font-medium text-rose-600">{errors.newUsername}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="restore-new-phone" className="text-sm font-medium text-slate-700">
            {t('Yangi telefon (ixtiyoriy)', { defaultValue: 'Yangi telefon (ixtiyoriy)' })}
          </label>
          <Input
            id="restore-new-phone"
            value={values.newPhone}
            onChange={(e) => onChange('newPhone', e.target.value)}
            placeholder={t("+998 90 123 45 67", { defaultValue: '+998 90 123 45 67' })}
            autoComplete="off"
            disabled={loading}
          />
          {errors.newPhone && (
            <p className="text-xs font-medium text-rose-600">{errors.newPhone}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('Bekor qilish', { defaultValue: 'Bekor qilish' })}
          </Button>
          <Button type="submit" variant="success" disabled={loading}>
            {loading
              ? t('Tiklanmoqda...', { defaultValue: 'Tiklanmoqda...' })
              : t('Tiklash', { defaultValue: 'Tiklash' })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ArchiveSection({
  subjects,
  classrooms,
  onOpenTeacherDetail,
  onOpenStudentDetail,
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('teachers');
  const [teacherQuery, setTeacherQuery] = useState(DEFAULT_LIST_QUERY);
  const [studentQuery, setStudentQuery] = useState(DEFAULT_LIST_QUERY);
  const [restoreTeacher, restoreTeacherState] = useRestoreTeacherMutation();
  const [restoreStudent, restoreStudentState] = useRestoreStudentMutation();
  const [restoreDialog, setRestoreDialog] = useState({
    open: false,
    type: null,
    personId: null,
    newUsername: '',
    newPhone: '',
    errors: {},
  });

  const teachersQueryResult = useGetTeachersQuery({ ...teacherQuery, status: 'archived' });
  const studentsQueryResult = useGetStudentsQuery({ ...studentQuery, status: 'archived' });

  const teachersData = teachersQueryResult.data || {};
  const studentsData = studentsQueryResult.data || {};

  const teachers = {
    items: teachersData.teachers || [],
    page: teachersData.page || teacherQuery.page || 1,
    pages: teachersData.pages || 1,
    loading: teachersQueryResult.isLoading || teachersQueryResult.isFetching,
    error: teachersQueryResult.error?.message || null,
  };

  const students = {
    items: studentsData.students || [],
    page: studentsData.page || studentQuery.page || 1,
    pages: studentsData.pages || 1,
    loading: studentsQueryResult.isLoading || studentsQueryResult.isFetching,
    error: studentsQueryResult.error?.message || null,
  };

  function openRestoreDialog(type, personId) {
    setRestoreDialog({
      open: true,
      type,
      personId,
      newUsername: '',
      newPhone: '',
      errors: {},
    });
  }

  function closeRestoreDialog() {
    setRestoreDialog((prev) => ({ ...prev, open: false, errors: {} }));
  }

  function updateRestoreField(field, value) {
    setRestoreDialog((prev) => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: undefined },
    }));
  }

  function validateRestoreForm() {
    const errors = {};
    const username = String(restoreDialog.newUsername || '').trim();
    const phone = String(restoreDialog.newPhone || '').trim();

    if (username && username.length > 100) {
      errors.newUsername = t("Username 100 ta belgidan oshmasin", {
        defaultValue: "Username 100 ta belgidan oshmasin",
      });
    }
    if (phone && (phone.length < 7 || phone.length > 30 || !PHONE_PATTERN.test(phone))) {
      errors.newPhone = t("Telefon formatini tekshiring", {
        defaultValue: "Telefon formatini tekshiring",
      });
    }

    if (Object.keys(errors).length) {
      setRestoreDialog((prev) => ({ ...prev, errors }));
      return null;
    }

    return {
      ...(username ? { newUsername: username } : {}),
      ...(phone ? { newPhone: phone } : {}),
    };
  }

  function handleRestoreTeacher(id) {
    openRestoreDialog('teacher', id);
  }

  function handleRestoreStudent(id) {
    openRestoreDialog('student', id);
  }

  const restoreLoading =
    (restoreDialog.type === 'teacher' && restoreTeacherState.isLoading) ||
    (restoreDialog.type === 'student' && restoreStudentState.isLoading);

  async function submitRestoreDialog() {
    if (!restoreDialog.personId || !restoreDialog.type) return;

    const payload = validateRestoreForm();
    if (!payload) return;

    try {
      let res;
      if (restoreDialog.type === 'teacher') {
        res = await restoreTeacher({
          teacherId: restoreDialog.personId,
          payload,
        }).unwrap();
        toast.success(
          t('Teacher tiklandi', { defaultValue: 'Teacher tiklandi' }) +
            (res?.credentialsHint?.username ? ` (${res.credentialsHint.username})` : ''),
        );
      } else {
        res = await restoreStudent({
          studentId: restoreDialog.personId,
          payload,
        }).unwrap();
        toast.success(
          t('Student tiklandi', { defaultValue: 'Student tiklandi' }) +
            (res?.credentialsHint?.username ? ` (${res.credentialsHint.username})` : ''),
        );
        if (res?.enrollmentRestoreReason === 'LATEST_CLASSROOM_ARCHIVED') {
          toast.warning(
            t("Student tiklandi, lekin oxirgi sinf arxivlanganligi sabab sinfga qayta biriktirilmadi", {
              defaultValue: "Student tiklandi, lekin oxirgi sinf arxivlanganligi sabab sinfga qayta biriktirilmadi",
            }),
          );
        }
      }

      if (res?.requiresCredentialUpdate) {
        toast.info(
          t("Login uchun username/telefonni yangilash tavsiya etiladi", {
            defaultValue: "Login uchun username/telefonni yangilash tavsiya etiladi",
          }),
        );
      }

      closeRestoreDialog();
    } catch (error) {
      const code = error?.code || error?.data?.code;
      if (code === 'USERNAME_TAKEN') {
        setRestoreDialog((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            newUsername: t('Bu username band', { defaultValue: 'Bu username band' }),
          },
        }));
      } else if (code === 'PHONE_TAKEN') {
        setRestoreDialog((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            newPhone: t('Bu telefon raqam tizimda mavjud', {
              defaultValue: 'Bu telefon raqam tizimda mavjud',
            }),
          },
        }));
      }
      toast.error(
        error?.message ||
          error?.data?.message ||
          t('Tiklash bajarilmadi', { defaultValue: 'Tiklash bajarilmadi' }),
      );
    }
  }

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <Card
          title={t('Arxiv')}
          subtitle={t("O'chirilgan (arxivlangan) teacher va studentlar ro'yxati. 'Batafsil' orqali barcha saqlangan ma'lumotlarni ko'ring.")}
        >
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <Button
              size="sm"
              variant={activeTab === 'teachers' ? 'indigo' : 'ghost'}
              onClick={() => setActiveTab('teachers')}
            >
              {t('Teacherlar arxivi')}
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'students' ? 'indigo' : 'ghost'}
              onClick={() => setActiveTab('students')}
            >
              {t('Studentlar arxivi')}
            </Button>
          </div>
        </Card>

        {activeTab === 'teachers' && (
          <PersonTable
            title={t("Arxiv teacherlar ro'yxati")}
            rows={teachers.items}
            showSubject
            showClassroom={false}
            loading={teachers.loading}
            error={teachers.error}
            page={teachers.page}
            pages={teachers.pages}
            onPageChange={(page) => setTeacherQuery((prev) => ({ ...prev, page }))}
            searchValue={teacherQuery.search}
            onSearchChange={(search) => setTeacherQuery((prev) => ({ ...prev, search, page: 1 }))}
            filterValue={teacherQuery.filter}
            onFilterChange={(filter) => setTeacherQuery((prev) => ({ ...prev, filter, page: 1 }))}
            filterOptions={(subjects || []).map((subject) => ({ value: subject.id, label: subject.name }))}
            sortValue={teacherQuery.sort}
            onSortChange={(sort) => setTeacherQuery((prev) => ({ ...prev, sort, page: 1 }))}
            pageSize={teacherQuery.limit}
            onPageSizeChange={(limit) => setTeacherQuery((prev) => ({ ...prev, limit, page: 1 }))}
            onDelete={handleRestoreTeacher}
            onOpenDetail={onOpenTeacherDetail}
            showDeleteAction
            deleteButtonLabel={t('Tiklash', { defaultValue: 'Tiklash' })}
            deleteActionVariant="success"
          />
        )}

        {activeTab === 'students' && (
          <PersonTable
            title={t("Arxiv studentlar ro'yxati")}
            rows={students.items}
            showSubject={false}
            showClassroom
            loading={students.loading}
            error={students.error}
            page={students.page}
            pages={students.pages}
            onPageChange={(page) => setStudentQuery((prev) => ({ ...prev, page }))}
            searchValue={studentQuery.search}
            onSearchChange={(search) => setStudentQuery((prev) => ({ ...prev, search, page: 1 }))}
            filterValue={studentQuery.filter}
            onFilterChange={(filter) => setStudentQuery((prev) => ({ ...prev, filter, page: 1 }))}
            filterOptions={(classrooms || []).map((classroom) => ({
              value: classroom.id,
              label: `${classroom.name} (${classroom.academicYear})`,
            }))}
            sortValue={studentQuery.sort}
            onSortChange={(sort) => setStudentQuery((prev) => ({ ...prev, sort, page: 1 }))}
            pageSize={studentQuery.limit}
            onPageSizeChange={(limit) => setStudentQuery((prev) => ({ ...prev, limit, page: 1 }))}
            onDelete={handleRestoreStudent}
            onOpenDetail={onOpenStudentDetail}
            showDeleteAction
            deleteButtonLabel={t('Tiklash', { defaultValue: 'Tiklash' })}
            deleteActionVariant="success"
          />
        )}

        <RestorePersonModal
          t={t}
          open={restoreDialog.open}
          type={restoreDialog.type}
          values={restoreDialog}
          errors={restoreDialog.errors}
          loading={Boolean(restoreLoading)}
          onClose={closeRestoreDialog}
          onChange={updateRestoreField}
          onSubmit={submitRestoreDialog}
        />
      </div>
    </AutoTranslate>
  );
}
