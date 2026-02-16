import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  createStudentThunk,
  createTeacherThunk,
  deleteStudentThunk,
  deleteTeacherThunk,
  fetchStudentsThunk,
  fetchTeachersThunk,
} from '../features/admin/adminSlice';

function PersonTable({ title, rows, loading, error, page, pages, onPageChange, onDelete, onOpenDetail }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span className="text-sm text-slate-500">Sahifa: {page} / {pages || 1}</span>
      </div>

      {loading && <p className="py-6 text-center text-sm text-slate-500">Yuklanmoqda...</p>}
      {error && <p className="py-6 text-center text-sm text-rose-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">F.I.SH</th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Telefon</th>
                <th className="px-3 py-2">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-3 py-3">{row.user?.username || '-'}</td>
                  <td className="px-3 py-3">{row.user?.phone || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onOpenDetail(row.id)}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Batafsil
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        O'chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                    Ma'lumot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          disabled={page <= 1}
        >
          Oldingi
        </button>
        <button
          onClick={() => onPageChange(Math.min(pages || 1, page + 1))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          disabled={page >= (pages || 1)}
        >
          Keyingi
        </button>
      </div>
    </section>
  );
}

function CredentialsModal({ open, data, onClose }) {
  if (!open || !data) return null;

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} nusxalandi`);
    } catch {
      toast.error(`${label} nusxalanmadi`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Yangi account ma'lumotlari</h3>
        <p className="mt-1 text-sm text-slate-600">
          {data.type === 'teacher' ? 'Teacher' : 'Student'} yaratildi. Login/parolni saqlab qo'ying.
        </p>

        <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Login:</span> {data.username}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Parol:</span> {data.password}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => copyText(`Login: ${data.username}\nParol: ${data.password}`, 'Login/parol')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Copy
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePersonPanel({
  loading,
  onCreateTeacher,
  onCreateStudent,
}) {
  const [createTab, setCreateTab] = useState('teacher');
  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    yashashManzili: '',
    phone: '',
    specialization: '',
  });
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    yashashManzili: '',
    phone: '',
    parentPhone: '',
  });

  async function handleTeacherSubmit(e) {
    e.preventDefault();
    const ok = await onCreateTeacher(teacherForm);
    if (ok) {
      setTeacherForm({
        firstName: '',
        lastName: '',
        birthDate: '',
        yashashManzili: '',
        phone: '',
        specialization: '',
      });
    }
  }

  async function handleStudentSubmit(e) {
    e.preventDefault();
    const ok = await onCreateStudent(studentForm);
    if (ok) {
      setStudentForm({
        firstName: '',
        lastName: '',
        birthDate: '',
        yashashManzili: '',
        phone: '',
        parentPhone: '',
      });
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Qo'shish</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateTab('teacher')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              createTab === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Add Teacher
          </button>
          <button
            onClick={() => setCreateTab('student')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              createTab === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Add Student
          </button>
        </div>
      </div>

      {createTab === 'teacher' ? (
        <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            required
            value={teacherForm.firstName}
            onChange={(e) => setTeacherForm((p) => ({ ...p, firstName: e.target.value }))}
            placeholder="Ism"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            value={teacherForm.lastName}
            onChange={(e) => setTeacherForm((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Familiya"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            required
            value={teacherForm.birthDate}
            onChange={(e) => setTeacherForm((p) => ({ ...p, birthDate: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            value={teacherForm.yashashManzili}
            onChange={(e) => setTeacherForm((p) => ({ ...p, yashashManzili: e.target.value }))}
            placeholder="Yashash manzili"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            type="text"
            value={teacherForm.phone}
            onChange={(e) => setTeacherForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Telefon (ixtiyoriy)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={teacherForm.specialization}
            onChange={(e) => setTeacherForm((p) => ({ ...p, specialization: e.target.value }))}
            placeholder="Mutaxassislik (ixtiyoriy)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Saqlanmoqda...' : 'Teacher yaratish'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            required
            value={studentForm.firstName}
            onChange={(e) => setStudentForm((p) => ({ ...p, firstName: e.target.value }))}
            placeholder="Ism"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            value={studentForm.lastName}
            onChange={(e) => setStudentForm((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Familiya"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            required
            value={studentForm.birthDate}
            onChange={(e) => setStudentForm((p) => ({ ...p, birthDate: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            value={studentForm.yashashManzili}
            onChange={(e) => setStudentForm((p) => ({ ...p, yashashManzili: e.target.value }))}
            placeholder="Yashash manzili"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            type="text"
            value={studentForm.phone}
            onChange={(e) => setStudentForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Telefon (ixtiyoriy)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={studentForm.parentPhone}
            onChange={(e) => setStudentForm((p) => ({ ...p, parentPhone: e.target.value }))}
            placeholder="Ota-ona telefoni (ixtiyoriy)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Saqlanmoqda...' : 'Student yaratish'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const teachers = useAppSelector((state) => state.admin.teachers);
  const students = useAppSelector((state) => state.admin.students);
  const actionLoading = useAppSelector((state) => state.admin.actionLoading);

  const [activeTab, setActiveTab] = useState('teachers');
  const [teacherQuery, setTeacherQuery] = useState({ search: '', page: 1, limit: 10 });
  const [studentQuery, setStudentQuery] = useState({ search: '', page: 1, limit: 10 });
  const [credentialsModal, setCredentialsModal] = useState({
    open: false,
    data: null,
  });

  useEffect(() => {
    dispatch(fetchTeachersThunk(teacherQuery));
  }, [dispatch, teacherQuery]);

  useEffect(() => {
    dispatch(fetchStudentsThunk(studentQuery));
  }, [dispatch, studentQuery]);

  async function handleDeleteTeacher(id) {
    const ok = window.confirm('Teacher ni o`chirmoqchimisiz?');
    if (!ok) return;

    const result = await dispatch(deleteTeacherThunk(id));
    if (deleteTeacherThunk.fulfilled.match(result)) {
      toast.success('Teacher o`chirildi');
      dispatch(fetchTeachersThunk(teacherQuery));
    } else {
      toast.error(result.payload || 'Teacher o`chirilmadi');
    }
  }

  async function handleDeleteStudent(id) {
    const ok = window.confirm('Student ni o`chirmoqchimisiz?');
    if (!ok) return;

    const result = await dispatch(deleteStudentThunk(id));
    if (deleteStudentThunk.fulfilled.match(result)) {
      toast.success('Student o`chirildi');
      dispatch(fetchStudentsThunk(studentQuery));
    } else {
      toast.error(result.payload || 'Student o`chirilmadi');
    }
  }

  async function handleCreateTeacher(form) {
    const result = await dispatch(createTeacherThunk(form));
    if (createTeacherThunk.fulfilled.match(result)) {
      const credentials = result.payload?.credentials;
      toast.success('Teacher muvaffaqiyatli yaratildi');
      if (credentials?.username && credentials?.password) {
        setCredentialsModal({
          open: true,
          data: {
            type: 'teacher',
            username: credentials.username,
            password: credentials.password,
          },
        });
      }
      dispatch(fetchTeachersThunk({ ...teacherQuery, page: 1 }));
      return true;
    }

    toast.error(result.payload || 'Teacher yaratilmadi');
    return false;
  }

  async function handleCreateStudent(form) {
    const result = await dispatch(createStudentThunk(form));
    if (createStudentThunk.fulfilled.match(result)) {
      const credentials = result.payload?.credentials;
      toast.success('Student muvaffaqiyatli yaratildi');
      if (credentials?.username && credentials?.password) {
        setCredentialsModal({
          open: true,
          data: {
            type: 'student',
            username: credentials.username,
            password: credentials.password,
          },
        });
      }
      dispatch(fetchStudentsThunk({ ...studentQuery, page: 1 }));
      return true;
    }

    toast.error(result.payload || 'Student yaratilmadi');
    return false;
  }

  const headerStats = useMemo(
    () => [
      { label: 'Teacherlar', value: teachers.total || 0 },
      { label: 'Studentlar', value: students.total || 0 },
      { label: 'Jami', value: (teachers.total || 0) + (students.total || 0) },
    ],
    [teachers.total, students.total],
  );

  return (
    <div className="space-y-6">
      <CredentialsModal
        open={credentialsModal.open}
        data={credentialsModal.data}
        onClose={() => setCredentialsModal({ open: false, data: null })}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {headerStats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm">
            <p className="text-xs uppercase tracking-widest text-slate-300">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('teachers')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'teachers' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Teacherlar
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'students' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Studentlar
            </button>
          </div>

          <div className="w-full sm:w-80">
            <input
              type="text"
              value={activeTab === 'teachers' ? teacherQuery.search : studentQuery.search}
              onChange={(e) => {
                const value = e.target.value;
                if (activeTab === 'teachers') {
                  setTeacherQuery((prev) => ({ ...prev, search: value, page: 1 }));
                } else {
                  setStudentQuery((prev) => ({ ...prev, search: value, page: 1 }));
                }
              }}
              placeholder="Ism bo'yicha qidirish..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900 focus:ring"
            />
          </div>
        </div>
      </section>

      <CreatePersonPanel
        loading={actionLoading}
        onCreateTeacher={handleCreateTeacher}
        onCreateStudent={handleCreateStudent}
      />

      {activeTab === 'teachers' ? (
        <PersonTable
          title="Teacherlar ro'yxati"
          rows={teachers.items}
          loading={teachers.loading}
          error={teachers.error}
          page={teachers.page}
          pages={teachers.pages}
          onPageChange={(page) => setTeacherQuery((prev) => ({ ...prev, page }))}
          onDelete={handleDeleteTeacher}
          onOpenDetail={(id) => navigate(`/teachers/${id}`)}
        />
      ) : (
        <PersonTable
          title="Studentlar ro'yxati"
          rows={students.items}
          loading={students.loading}
          error={students.error}
          page={students.page}
          pages={students.pages}
          onPageChange={(page) => setStudentQuery((prev) => ({ ...prev, page }))}
          onDelete={handleDeleteStudent}
          onOpenDetail={(id) => navigate(`/students/${id}`)}
        />
      )}
    </div>
  );
}
