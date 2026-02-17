import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DataTable,
  Input,
  Modal,
  Select,
  StateView,
  Tabs,
} from '../../components/ui';
import {
  createClassroomThunk,
  createDarsJadvaliThunk,
  createStudentThunk,
  createSubjectThunk,
  createTeacherThunk,
  createVaqtOraliqThunk,
  deleteClassroomThunk,
  deleteDarsJadvaliThunk,
  deleteSubjectThunk,
  deleteStudentThunk,
  deleteTeacherThunk,
  deleteVaqtOraliqThunk,
  fetchClassroomsThunk,
  fetchDarsJadvaliThunk,
  fetchSubjectsThunk,
  fetchStudentsThunk,
  fetchTeachersThunk,
  fetchVaqtOraliqlariThunk,
  updateDarsJadvaliThunk,
} from './adminSlice';

function PersonTable({
  title,
  rows,
  loading,
  error,
  page,
  pages,
  onPageChange,
  onDelete,
  onOpenDetail,
  showSubject,
  showClassroom,
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  filterOptions,
  sortValue,
  onSortChange,
  pageSize,
  onPageSizeChange,
}) {
  const sortOptions = [
    { value: 'name:asc', label: 'Ism A-Z' },
    { value: 'name:desc', label: 'Ism Z-A' },
    { value: 'username:asc', label: 'Username A-Z' },
    { value: 'username:desc', label: 'Username Z-A' },
  ];

  if (showSubject) {
    sortOptions.push({ value: 'subject:asc', label: 'Fan A-Z' });
    sortOptions.push({ value: 'subject:desc', label: 'Fan Z-A' });
  }
  if (showClassroom) {
    sortOptions.push({ value: 'classroom:asc', label: 'Sinf A-Z' });
    sortOptions.push({ value: 'classroom:desc', label: 'Sinf Z-A' });
  }

  const columns = [
    {
      key: 'fullName',
      header: 'F.I.SH',
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: 'username',
      header: 'Username',
      render: (row) => row.user?.username || '-',
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => row.user?.phone || '-',
    },
    ...(showSubject
      ? [
          {
            key: 'subject',
            header: 'Fan',
            render: (row) => row.subject?.name || '-',
          },
        ]
      : []),
    ...(showClassroom
      ? [
          {
            key: 'classroom',
            header: 'Sinf',
            render: (row) =>
              row.enrollments?.[0]?.classroom
                ? `${row.enrollments[0].classroom.name} (${row.enrollments[0].classroom.academicYear})`
                : '-',
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Amallar',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="indigo" onClick={() => onOpenDetail(row.id)}>
            Batafsil
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(row.id)}>
            O'chirish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={title}
      actions={<span className="text-sm text-slate-500">Sahifa: {page} / {pages || 1}</span>}
    >
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Qidirish..."
        />
        <Select value={filterValue} onChange={(e) => onFilterChange(e.target.value)}>
          <option value="all">Hammasi</option>
          {filterOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={sortValue} onChange={(e) => onSortChange(e.target.value)}>
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} ta / sahifa
            </option>
          ))}
        </Select>
      </div>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        rows.length ? (
          <DataTable
            columns={columns}
            rows={rows}
            stickyHeader
            maxHeightClassName="max-h-[520px]"
          />
        ) : (
          <StateView type="empty" />
        )
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          variant="secondary"
          size="sm"
          disabled={page <= 1}
        >
          Oldingi
        </Button>
        <Button
          onClick={() => onPageChange(Math.min(pages || 1, page + 1))}
          variant="secondary"
          size="sm"
          disabled={page >= (pages || 1)}
        >
          Keyingi
        </Button>
      </div>
    </Card>
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
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-md"
      title="Yangi account ma'lumotlari"
      subtitle={`${data.type === 'teacher' ? 'Teacher' : 'Student'} yaratildi. Login/parolni saqlab qo'ying.`}
    >
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Login:</span> {data.username}
        </p>
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Parol:</span> {data.password}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => copyText(`Login: ${data.username}\nParol: ${data.password}`, 'Login/parol')}
          variant="secondary"
        >
          Copy
        </Button>
      </div>
    </Modal>
  );
}

function SubjectManager({ subjects, loading, actionLoading, onCreateSubject, onDeleteSubject }) {
  const [name, setName] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onCreateSubject(name);
    if (ok) setName('');
  }

  const columns = [
    { key: 'name', header: 'Fan', render: (subject) => subject.name },
    {
      key: 'actions',
      header: 'Amal',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (subject) => (
        <Button
          size="sm"
          variant="danger"
          disabled={actionLoading}
          onClick={() => onDeleteSubject(subject.id)}
        >
          O'chirish
        </Button>
      ),
    },
  ];

  return (
    <Card title="Fanlar boshqaruvi" actions={<span className="text-sm text-slate-500">Jami: {subjects.length}</span>}>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yangi fan nomi"
        />
        <Button type="submit" variant="success" disabled={actionLoading}>
          Qo'shish
        </Button>
      </form>

      {loading ? (
        <StateView type="loading" />
      ) : subjects.length ? (
        <DataTable columns={columns} rows={subjects} stickyHeader maxHeightClassName="max-h-56" />
      ) : (
        <StateView type="empty" description="Fanlar mavjud emas" />
      )}
    </Card>
  );
}

function ClassroomManager({
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

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onCreateClassroom({ name, academicYear });
    if (ok) {
      setName('');
    }
  }

  async function handleDeleteClassroomOptimistic(classroomId) {
    const snapshot = localClassrooms;
    setLocalClassrooms((prev) => prev.filter((item) => item.id !== classroomId));
    if (openedClassroomId === classroomId) {
      setOpenedClassroomId(null);
    }

    const ok = await onDeleteClassroom(classroomId);
    if (!ok) {
      setLocalClassrooms(snapshot);
    }
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
          onChange={(e) => setName(e.target.value)}
          placeholder="Masalan: 6-A"
        />
        <Input
          type="text"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpenedClassroomId(classroom.id)}
                >
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
        subtitle={
          selectedClassroom
            ? `O'quvchilar soni: ${selectedClassroom.studentCount || 0} ta`
            : null
        }
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

const HAFTA_KUNLARI = ['DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA'];
const HAFTA_KUNI_LABEL = {
  DUSHANBA: 'Dushanba',
  SESHANBA: 'Seshanba',
  CHORSHANBA: 'Chorshanba',
  PAYSHANBA: 'Payshanba',
  JUMA: 'Juma',
  SHANBA: 'Shanba',
};

function fanRangi(fanNomi) {
  const palitra = [
    'bg-sky-50 border-sky-200 text-sky-800',
    'bg-emerald-50 border-emerald-200 text-emerald-800',
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-rose-50 border-rose-200 text-rose-800',
    'bg-violet-50 border-violet-200 text-violet-800',
    'bg-cyan-50 border-cyan-200 text-cyan-800',
  ];
  if (!fanNomi) return palitra[0];
  const sum = [...fanNomi].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palitra[sum % palitra.length];
}

function DarsJadvaliManager({
  actionLoading,
  classrooms,
  subjects,
  teachers,
  vaqtOraliqlari,
  darslar,
  darslarLoading,
  onCreateVaqtOraliq,
  onDeleteVaqtOraliq,
  onCreateDars,
  onDeleteDars,
  onMoveDars,
}) {
  const [vaqtForm, setVaqtForm] = useState({
    nomi: '',
    boshlanishVaqti: '08:30',
    tugashVaqti: '09:15',
    tartib: 1,
  });

  const [darsForm, setDarsForm] = useState({
    sinfId: classrooms[0]?.id || '',
    oqituvchiId: teachers[0]?.id || '',
    fanId: subjects[0]?.id || '',
    haftaKuni: HAFTA_KUNLARI[0],
    vaqtOraliqId: vaqtOraliqlari[0]?.id || '',
    oquvYili: '2025-2026',
  });
  const [gridSinfId, setGridSinfId] = useState('');
  const [gridOquvYili, setGridOquvYili] = useState('2025-2026');
  const [dragDarsId, setDragDarsId] = useState(null);
  const [tezQoshish, setTezQoshish] = useState(null); // { haftaKuni, vaqtOraliqId }
  const [tezQoshishJoylashuv, setTezQoshishJoylashuv] = useState(null); // { top, left }
  const [tezQoshishOqituvchiId, setTezQoshishOqituvchiId] = useState('');
  const [tezQoshishFanId, setTezQoshishFanId] = useState('');
  const [jadvalXatolik, setJadvalXatolik] = useState(null);
  const tezQoshishRef = useRef(null);
  const tanlanganSinfId = darsForm.sinfId || classrooms[0]?.id || '';
  const tanlanganFanId = darsForm.fanId || subjects[0]?.id || '';
  const tanlanganVaqtOraliqId = darsForm.vaqtOraliqId || vaqtOraliqlari[0]?.id || '';
  const tanlanganGridSinfId = gridSinfId || classrooms[0]?.id || '';
  const fanBoyichaOqituvchilar = useMemo(
    () => teachers.filter((t) => t.subject?.id === tanlanganFanId),
    [teachers, tanlanganFanId],
  );
  const tanlanganOqituvchiId = fanBoyichaOqituvchilar.some((t) => t.id === darsForm.oqituvchiId)
    ? darsForm.oqituvchiId
    : fanBoyichaOqituvchilar[0]?.id || '';
  const tezTanlanganFanId = tezQoshishFanId || tanlanganFanId || subjects[0]?.id || '';
  const tezFanBoyichaOqituvchilar = useMemo(
    () => teachers.filter((t) => t.subject?.id === tezTanlanganFanId),
    [teachers, tezTanlanganFanId],
  );
  const tanlanganTezOqituvchiId = tezFanBoyichaOqituvchilar.some((t) => t.id === tezQoshishOqituvchiId)
    ? tezQoshishOqituvchiId
    : tezFanBoyichaOqituvchilar[0]?.id || '';

  const saralanganVaqtlar = [...vaqtOraliqlari].sort((a, b) => a.tartib - b.tartib);

  const gridDarslar = darslar.filter(
    (d) => d.sinfId === tanlanganGridSinfId && d.oquvYili === gridOquvYili,
  );

  const gridMap = new Map();
  for (const d of gridDarslar) {
    gridMap.set(`${d.haftaKuni}__${d.vaqtOraliqId}`, d);
  }

  function openTezQoshish(event, haftaKuni, vaqtOraliqId) {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelWidth = 420;
    const panelHeight = 230;
    const spaceRight = window.innerWidth - rect.right;
    const left = spaceRight > panelWidth + 12
      ? rect.right + 8
      : Math.max(12, rect.left - panelWidth - 8);
    const top = Math.min(
      Math.max(12, rect.top),
      Math.max(12, window.innerHeight - panelHeight - 12),
    );

    setTezQoshish({ haftaKuni, vaqtOraliqId });
    setTezQoshishJoylashuv({ top, left });
    setTezQoshishFanId(tanlanganFanId || subjects[0]?.id || '');
    setTezQoshishOqituvchiId('');
  }

  async function handleVaqtSubmit(e) {
    e.preventDefault();
    const ok = await onCreateVaqtOraliq({ ...vaqtForm, tartib: Number(vaqtForm.tartib) });
    if (ok) {
      setVaqtForm((prev) => ({ ...prev, nomi: '', tartib: prev.tartib + 1 }));
    }
  }

  async function handleDarsSubmit(e) {
    e.preventDefault();
    const result = await onCreateDars({
      ...darsForm,
      sinfId: tanlanganSinfId,
      oqituvchiId: tanlanganOqituvchiId,
      fanId: tanlanganFanId,
      vaqtOraliqId: tanlanganVaqtOraliqId,
    });
    if (result?.isConflict) {
      setJadvalXatolik({
        title: "Dars vaqti to'qnashuvi",
        message:
          result.message ||
          "Tanlangan vaqt oralig'ida sinf yoki o'qituvchi allaqachon band. Boshqa vaqt yoki boshqa o'qituvchini tanlang.",
      });
    }
  }

  async function handleTezQoshishSubmit(e) {
    e.preventDefault();
    if (!tezQoshish) return;
    const result = await onCreateDars({
      sinfId: tanlanganGridSinfId,
      oqituvchiId: tanlanganTezOqituvchiId,
      fanId: tezTanlanganFanId,
      haftaKuni: tezQoshish.haftaKuni,
      vaqtOraliqId: tezQoshish.vaqtOraliqId,
      oquvYili: gridOquvYili,
    });
    if (result?.ok) {
      setTezQoshish(null);
      setTezQoshishJoylashuv(null);
      setTezQoshishOqituvchiId('');
      setTezQoshishFanId('');
    } else if (result?.isConflict) {
      setJadvalXatolik({
        title: "Dars vaqti to'qnashuvi",
        message:
          result.message ||
          "Bu katakka dars qo'shib bo'lmadi, chunki vaqt oralig'i band.",
      });
    }
  }

  async function handleDropDars(targetHaftaKuni, targetVaqtOraliqId) {
    if (!dragDarsId) return;
    const result = await onMoveDars(dragDarsId, {
      haftaKuni: targetHaftaKuni,
      vaqtOraliqId: targetVaqtOraliqId,
      sinfId: tanlanganGridSinfId,
      oquvYili: gridOquvYili,
    });
    if (result?.ok) {
      setDragDarsId(null);
    } else if (result?.isConflict) {
      setJadvalXatolik({
        title: "Ko'chirishda to'qnashuv",
        message:
          result.message ||
          "Darsni bu slotga ko'chirib bo'lmaydi: shu vaqtda boshqa dars mavjud.",
      });
    }
  }

  useEffect(() => {
    if (!tezQoshish) return;
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setTezQoshish(null);
        setTezQoshishJoylashuv(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tezQoshish]);

  function handleExportPdf() {
    const sinfNomi = classrooms.find((c) => c.id === tanlanganGridSinfId)?.name || '';
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;

    const rows = saralanganVaqtlar
      .map((v) => {
        const cols = HAFTA_KUNLARI.map((k) => {
          const d = gridMap.get(`${k}__${v.id}`);
          const body = d
            ? `${d.fan?.name || ''}<br/><small>${d.oqituvchi?.firstName || ''} ${d.oqituvchi?.lastName || ''}</small>`
            : "<span style='color:#9ca3af'>Bo'sh</span>";
          return `<td style="border:1px solid #e2e8f0;padding:8px;vertical-align:top;">${body}</td>`;
        }).join('');
        return `<tr><td style="border:1px solid #e2e8f0;padding:8px;"><b>${v.nomi}</b><br/><small>${v.boshlanishVaqti}-${v.tugashVaqti}</small></td>${cols}</tr>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Dars jadvali</title>
          <style>
            body{font-family:Arial,sans-serif;padding:18px;color:#0f172a}
            h2{margin:0 0 4px}
            table{width:100%;border-collapse:collapse;font-size:12px}
            th{background:#0f172a;color:white;border:1px solid #e2e8f0;padding:8px;text-align:left}
          </style>
        </head>
        <body>
          <h2>${sinfNomi} sinf dars jadvali</h2>
          <p>${gridOquvYili} o'quv yili</p>
          <table>
            <thead>
              <tr>
                <th>Vaqt</th>
                ${HAFTA_KUNLARI.map((k) => `<th>${HAFTA_KUNI_LABEL[k]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <Card title="Dars jadvali boshqaruvi">
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Fan ranglari (legend)</p>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <span
              key={subject.id}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${fanRangi(subject.name)}`}
            >
              {subject.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <form onSubmit={handleVaqtSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-700">Vaqt oralig'i qo'shish</p>
          <Input
            type="text"
            placeholder="Nomi (1-para)"
            value={vaqtForm.nomi}
            onChange={(e) => setVaqtForm((p) => ({ ...p, nomi: e.target.value }))}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="time"
              value={vaqtForm.boshlanishVaqti}
              onChange={(e) => setVaqtForm((p) => ({ ...p, boshlanishVaqti: e.target.value }))}
              required
            />
            <Input
              type="time"
              value={vaqtForm.tugashVaqti}
              onChange={(e) => setVaqtForm((p) => ({ ...p, tugashVaqti: e.target.value }))}
              required
            />
            <Input
              type="number"
              min={1}
              value={vaqtForm.tartib}
              onChange={(e) => setVaqtForm((p) => ({ ...p, tartib: e.target.value }))}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={actionLoading}
            variant="success"
          >
            Vaqt oralig'ini saqlash
          </Button>
        </form>

        <form onSubmit={handleDarsSubmit} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-700">Dars jadvaliga dars qo'shish</p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={tanlanganSinfId}
              onChange={(e) => setDarsForm((p) => ({ ...p, sinfId: e.target.value }))}
              required
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.academicYear})
                </option>
              ))}
            </Select>
            <Select
              value={tanlanganOqituvchiId}
              onChange={(e) => setDarsForm((p) => ({ ...p, oqituvchiId: e.target.value }))}
              required
            >
              {fanBoyichaOqituvchilar.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </Select>
            <Select
              value={tanlanganFanId}
              onChange={(e) => setDarsForm((p) => ({ ...p, fanId: e.target.value }))}
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              value={darsForm.haftaKuni}
              onChange={(e) => setDarsForm((p) => ({ ...p, haftaKuni: e.target.value }))}
              required
            >
              {HAFTA_KUNLARI.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
            <Select
              value={tanlanganVaqtOraliqId}
              onChange={(e) => setDarsForm((p) => ({ ...p, vaqtOraliqId: e.target.value }))}
              required
            >
              {vaqtOraliqlari.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nomi} ({v.boshlanishVaqti}-{v.tugashVaqti})
                </option>
              ))}
            </Select>
            <Input
              type="text"
              value={darsForm.oquvYili}
              onChange={(e) => setDarsForm((p) => ({ ...p, oquvYili: e.target.value }))}
              placeholder="2025-2026"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={actionLoading || !classrooms.length || !fanBoyichaOqituvchilar.length || !subjects.length || !vaqtOraliqlari.length}
            variant="indigo"
          >
            Darsni jadvalga qo'shish
          </Button>
          {!fanBoyichaOqituvchilar.length && (
            <p className="text-xs text-rose-600">
              Bu fan uchun o'qituvchi topilmadi. Avval shu fan o'qituvchisini yarating.
            </p>
          )}
        </form>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">Vaqt oraliqlari ro'yxati</p>
          <div className="max-h-52 overflow-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {vaqtOraliqlari.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{v.tartib}. {v.nomi}</td>
                    <td className="px-2 py-2">{v.boshlanishVaqti}-{v.tugashVaqti}</td>
                    <td className="px-2 py-2 text-right">
                      <Button size="sm" variant="danger" onClick={() => onDeleteVaqtOraliq(v.id)}>
                        O'chirish
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-700">Haftalik jadval ko'rinishi</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={tanlanganGridSinfId}
                onChange={(e) => setGridSinfId(e.target.value)}
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input
                type="text"
                value={gridOquvYili}
                onChange={(e) => setGridOquvYili(e.target.value)}
                placeholder="2025-2026"
              />
              <Button
                onClick={handleExportPdf}
                size="sm"
              >
                PDF export
              </Button>
            </div>
          </div>
          {darslarLoading ? (
            <p className="text-sm text-slate-500">Yuklanmoqda...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 lg:overflow-x-visible">
              <table className="w-full table-fixed text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">Vaqt</th>
                    {HAFTA_KUNLARI.map((k) => (
                      <th key={k} className="px-2 py-2 text-left">
                        {HAFTA_KUNI_LABEL[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saralanganVaqtlar.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100 align-top">
                      <td className="w-28 px-2 py-2 text-slate-700">
                        <p className="font-semibold">{v.nomi}</p>
                        <p className="text-[11px] text-slate-500">
                          {v.boshlanishVaqti} - {v.tugashVaqti}
                        </p>
                      </td>
                      {HAFTA_KUNLARI.map((k) => {
                        const d = gridMap.get(`${k}__${v.id}`);
                        return (
                          <td
                            key={`${k}-${v.id}`}
                            className="group px-2 py-2"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropDars(k, v.id)}
                            onClick={(event) => {
                              if (!d) openTezQoshish(event, k, v.id);
                            }}
                          >
                            {d ? (
                              <div
                                draggable
                                onDragStart={() => setDragDarsId(d.id)}
                                className={`rounded-md border p-2 cursor-move ${fanRangi(d.fan?.name)}`}
                                title="Boshqa katakka sudrab ko'chiring"
                              >
                                <p className="truncate font-semibold">{d.fan?.name}</p>
                                <p className="truncate text-[11px]">
                                  {d.oqituvchi?.firstName} {d.oqituvchi?.lastName}
                                </p>
                                <div className="mt-2 hidden group-hover:block">
                                  <Button
                                    onClick={() => onDeleteDars(d.id)}
                                    size="sm"
                                    variant="danger"
                                  >
                                    O'chirish
                                  </Button>
                                </div>
                                <p className="mt-1 hidden text-[10px] text-slate-600 group-hover:block">
                                  Quick: sudrab boshqa slotga ko'chiring
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-400">
                                <p>Bo'sh slot</p>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="mt-1 hidden group-hover:inline-flex"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTezQoshish(event, k, v.id);
                                  }}
                                >
                                  + Tez qo'shish
                                </Button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {tezQoshish && tezQoshishJoylashuv && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/10"
            onClick={() => {
              setTezQoshish(null);
              setTezQoshishJoylashuv(null);
            }}
          />
          <div
            ref={tezQoshishRef}
            className="fixed z-50 w-[420px] max-w-[calc(100vw-24px)] rounded-lg border border-indigo-200 bg-white p-3 shadow-xl"
            style={{ top: tezQoshishJoylashuv.top, left: tezQoshishJoylashuv.left }}
          >
            <p className="text-sm font-semibold text-indigo-900">
              Tez qo'shish: {HAFTA_KUNI_LABEL[tezQoshish.haftaKuni]} /{' '}
              {vaqtOraliqlari.find((v) => v.id === tezQoshish.vaqtOraliqId)?.boshlanishVaqti}
            </p>
            <form onSubmit={handleTezQoshishSubmit} className="mt-2 grid grid-cols-1 gap-2">
              <Select
                value={tezTanlanganFanId}
                onChange={(e) => setTezQoshishFanId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                value={tanlanganTezOqituvchiId}
                onChange={(e) => setTezQoshishOqituvchiId(e.target.value)}
              >
                {tezFanBoyichaOqituvchilar.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </Select>
              {!tezFanBoyichaOqituvchilar.length && (
                <p className="text-xs text-rose-600">
                  Tanlangan fan uchun o'qituvchi topilmadi.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="submit" variant="indigo" disabled={!tezFanBoyichaOqituvchilar.length}>
                  Saqlash
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setTezQoshish(null);
                    setTezQoshishJoylashuv(null);
                  }}
                  variant="secondary"
                >
                  Bekor
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      <Modal
        open={Boolean(jadvalXatolik)}
        onClose={() => setJadvalXatolik(null)}
        maxWidth="max-w-md"
        title={jadvalXatolik?.title || "Jadval xatosi"}
        subtitle={jadvalXatolik?.message || ''}
      >
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setJadvalXatolik(null)}>
            Tushunarli
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function CreatePersonPanel({
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

  async function handleTeacherSubmit(e) {
    e.preventDefault();
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

  async function handleStudentSubmit(e) {
    e.preventDefault();
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
            onChange={(e) => setTeacherForm((p) => ({ ...p, firstName: e.target.value }))}
            placeholder="Ism"
          />
          <Input
            type="text"
            required
            value={teacherForm.lastName}
            onChange={(e) => setTeacherForm((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Familiya"
          />
          <Input
            type="date"
            required
            value={teacherForm.birthDate}
            onChange={(e) => setTeacherForm((p) => ({ ...p, birthDate: e.target.value }))}
          />
          <Input
            type="text"
            required
            value={teacherForm.yashashManzili}
            onChange={(e) => setTeacherForm((p) => ({ ...p, yashashManzili: e.target.value }))}
            placeholder="Yashash manzili"
            className="md:col-span-2"
          />
          <Input
            type="text"
            required
            value={teacherForm.phone}
            onChange={(e) => setTeacherForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Telefon"
          />
          <Select
            required
            value={selectedSubjectId}
            onChange={(e) => setTeacherForm((p) => ({ ...p, subjectId: e.target.value }))}
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
            onChange={(e) => setStudentForm((p) => ({ ...p, firstName: e.target.value }))}
            placeholder="Ism"
          />
          <Input
            type="text"
            required
            value={studentForm.lastName}
            onChange={(e) => setStudentForm((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Familiya"
          />
          <Input
            type="date"
            required
            value={studentForm.birthDate}
            onChange={(e) => setStudentForm((p) => ({ ...p, birthDate: e.target.value }))}
          />
          <Input
            type="text"
            required
            value={studentForm.yashashManzili}
            onChange={(e) => setStudentForm((p) => ({ ...p, yashashManzili: e.target.value }))}
            placeholder="Yashash manzili"
            className="md:col-span-2"
          />
          <Select
            required
            value={selectedClassroomId}
            onChange={(e) => setStudentForm((p) => ({ ...p, classroomId: e.target.value }))}
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
            onChange={(e) => setStudentForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Telefon"
          />
          <Input
            type="text"
            required
            value={studentForm.parentPhone}
            onChange={(e) => setStudentForm((p) => ({ ...p, parentPhone: e.target.value }))}
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

export default function AdminWorkspace({ section }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const confirmResolverRef = useRef(null);

  const teachers = useAppSelector((state) => state.admin.teachers);
  const students = useAppSelector((state) => state.admin.students);
  const subjects = useAppSelector((state) => state.admin.subjects);
  const classrooms = useAppSelector((state) => state.admin.classrooms);
  const vaqtOraliqlari = useAppSelector((state) => state.admin.vaqtOraliqlari);
  const darsJadvali = useAppSelector((state) => state.admin.darsJadvali);
  const actionLoading = useAppSelector((state) => state.admin.actionLoading);

  const [teacherQuery, setTeacherQuery] = useState({
    search: '',
    page: 1,
    limit: 10,
    filter: 'all',
    sort: 'name:asc',
  });
  const [studentQuery, setStudentQuery] = useState({
    search: '',
    page: 1,
    limit: 10,
    filter: 'all',
    sort: 'name:asc',
  });
  const [credentialsModal, setCredentialsModal] = useState({
    open: false,
    data: null,
  });
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Tasdiqlash',
    message: '',
  });

  const isDashboardSection = section === 'dashboard';
  const isTeachersSection = section === 'teachers';
  const isSubjectsSection = section === 'subjects';
  const isStudentsSection = section === 'students';
  const isClassroomsSection = section === 'classrooms';
  const isJadvalSection = section === 'jadval';

  useEffect(() => {
    if (isTeachersSection) {
      dispatch(fetchTeachersThunk(teacherQuery));
    }
  }, [dispatch, teacherQuery, isTeachersSection]);

  useEffect(() => {
    if (isDashboardSection) {
      dispatch(fetchTeachersThunk({ page: 1, limit: 1, search: '', filter: 'all', sort: 'createdAt:desc' }));
    }
  }, [dispatch, isDashboardSection]);

  useEffect(() => {
    if (isJadvalSection) {
      dispatch(fetchTeachersThunk({ page: 1, limit: 100, search: '', filter: 'all', sort: 'name:asc' }));
    }
  }, [dispatch, isJadvalSection]);

  useEffect(() => {
    if (isStudentsSection) {
      dispatch(fetchStudentsThunk(studentQuery));
    }
  }, [dispatch, studentQuery, isStudentsSection]);

  useEffect(() => {
    if (isDashboardSection) {
      dispatch(fetchStudentsThunk({ page: 1, limit: 1, search: '', filter: 'all', sort: 'createdAt:desc' }));
    }
  }, [dispatch, isDashboardSection]);

  useEffect(() => {
    if (isTeachersSection || isJadvalSection || isSubjectsSection) {
      dispatch(fetchSubjectsThunk());
    }
  }, [dispatch, isTeachersSection, isJadvalSection, isSubjectsSection]);

  useEffect(() => {
    if (isStudentsSection || isClassroomsSection || isJadvalSection || isDashboardSection) {
      dispatch(fetchClassroomsThunk());
    }
  }, [dispatch, isStudentsSection, isClassroomsSection, isJadvalSection, isDashboardSection]);

  useEffect(() => {
    if (isJadvalSection) {
      dispatch(fetchVaqtOraliqlariThunk());
    }
  }, [dispatch, isJadvalSection]);

  useEffect(() => {
    if (isJadvalSection) {
      dispatch(fetchDarsJadvaliThunk());
    }
  }, [dispatch, isJadvalSection]);

  useEffect(
    () => () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
        confirmResolverRef.current = null;
      }
    },
    [],
  );

  function askConfirm(message, title = 'Tasdiqlash') {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ open: true, title, message });
    });
  }

  function handleConfirmClose(result) {
    setConfirmState((prev) => ({ ...prev, open: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  }

  async function handleDeleteTeacher(id) {
    const ok = await askConfirm('Teacher ni o`chirmoqchimisiz?', "Teacherni o'chirish");
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
    const ok = await askConfirm('Student ni o`chirmoqchimisiz?', "Studentni o'chirish");
    if (!ok) return false;

    const result = await dispatch(deleteStudentThunk(id));
    if (deleteStudentThunk.fulfilled.match(result)) {
      toast.success('Student o`chirildi');
      dispatch(fetchStudentsThunk(studentQuery));
      dispatch(fetchClassroomsThunk());
      return true;
    } else {
      toast.error(result.payload || 'Student o`chirilmadi');
      return false;
    }
  }

  async function handleCreateTeacher(form) {
    const result = await dispatch(createTeacherThunk(form));
    if (createTeacherThunk.fulfilled.match(result)) {
      const teacherId = result.payload?.teacherId;
      toast.success('Teacher muvaffaqiyatli yaratildi');
      if (teacherId) {
        navigate(`/admin/teachers/${teacherId}`);
      } else {
        dispatch(fetchTeachersThunk({ ...teacherQuery, page: 1 }));
      }
      return true;
    }

    toast.error(result.payload || 'Teacher yaratilmadi');
    return false;
  }

  async function handleCreateStudent(form) {
    const result = await dispatch(createStudentThunk(form));
    if (createStudentThunk.fulfilled.match(result)) {
      const studentId = result.payload?.studentId;
      toast.success('Student muvaffaqiyatli yaratildi');
      if (studentId) {
        navigate(`/admin/students/${studentId}`);
      } else {
        dispatch(fetchStudentsThunk({ ...studentQuery, page: 1 }));
      }
      return true;
    }

    toast.error(result.payload || 'Student yaratilmadi');
    return false;
  }

  async function handleCreateSubject(name) {
    const result = await dispatch(createSubjectThunk({ name }));
    if (createSubjectThunk.fulfilled.match(result)) {
      toast.success('Fan qo`shildi');
      dispatch(fetchSubjectsThunk());
      return true;
    }

    toast.error(result.payload || 'Fan qo`shilmadi');
    return false;
  }

  async function handleDeleteSubject(id) {
    const ok = await askConfirm('Fanni o`chirmoqchimisiz?', "Fanni o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteSubjectThunk(id));
    if (deleteSubjectThunk.fulfilled.match(result)) {
      toast.success('Fan o`chirildi');
      dispatch(fetchSubjectsThunk());
      return;
    }

    toast.error(result.payload || 'Fan o`chirilmadi');
  }

  async function handleCreateClassroom(payload) {
    const result = await dispatch(createClassroomThunk(payload));
    if (createClassroomThunk.fulfilled.match(result)) {
      toast.success('Sinf qo`shildi');
      dispatch(fetchClassroomsThunk());
      return true;
    }

    toast.error(result.payload || 'Sinf qo`shilmadi');
    return false;
  }

  async function handleDeleteClassroom(id) {
    const ok = await askConfirm('Sinfni o`chirmoqchimisiz?', "Sinfni o'chirish");
    if (!ok) return false;

    const result = await dispatch(deleteClassroomThunk(id));
    if (deleteClassroomThunk.fulfilled.match(result)) {
      toast.success('Sinf o`chirildi');
      dispatch(fetchClassroomsThunk());
      return true;
    }

    toast.error(result.payload || 'Sinf o`chirilmadi');
    return false;
  }

  async function handleCreateVaqtOraliq(payload) {
    const result = await dispatch(createVaqtOraliqThunk(payload));
    if (createVaqtOraliqThunk.fulfilled.match(result)) {
      toast.success('Vaqt oralig`i qo`shildi');
      dispatch(fetchVaqtOraliqlariThunk());
      return true;
    }
    toast.error(result.payload || 'Vaqt oralig`i qo`shilmadi');
    return false;
  }

  async function handleDeleteVaqtOraliq(id) {
    const ok = await askConfirm("Vaqt oralig`ini o`chirmoqchimisiz?", "Vaqt oralig'ini o'chirish");
    if (!ok) return;
    const result = await dispatch(deleteVaqtOraliqThunk(id));
    if (deleteVaqtOraliqThunk.fulfilled.match(result)) {
      toast.success('Vaqt oralig`i o`chirildi');
      dispatch(fetchVaqtOraliqlariThunk());
      return;
    }
    toast.error(result.payload || 'Vaqt oralig`i o`chirilmadi');
  }

  async function handleCreateDars(payload) {
    const result = await dispatch(createDarsJadvaliThunk(payload));
    if (createDarsJadvaliThunk.fulfilled.match(result)) {
      toast.success('Dars jadvalga qo`shildi');
      dispatch(fetchDarsJadvaliThunk());
      return { ok: true };
    }

    const message = result.payload || 'Dars qo`shilmadi';
    const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud/i.test(message);
    if (!isConflict) {
      toast.error(message);
    } else {
      toast.warning("Dars qo'shib bo'lmadi: vaqt to'qnashuvi");
    }
    return { ok: false, isConflict, message };
  }

  async function handleDeleteDars(id) {
    const ok = await askConfirm('Darsni jadvaldan o`chirmoqchimisiz?', "Darsni o'chirish");
    if (!ok) return;
    const result = await dispatch(deleteDarsJadvaliThunk(id));
    if (deleteDarsJadvaliThunk.fulfilled.match(result)) {
      toast.success('Dars jadvaldan o`chirildi');
      dispatch(fetchDarsJadvaliThunk());
      return;
    }
    toast.error(result.payload || 'Dars o`chirilmadi');
  }

  async function handleMoveDars(id, payload) {
    const result = await dispatch(updateDarsJadvaliThunk({ id, payload }));
    if (updateDarsJadvaliThunk.fulfilled.match(result)) {
      dispatch(fetchDarsJadvaliThunk());
      toast.success("Dars muvaffaqiyatli ko'chirildi");
      return { ok: true };
    }

    const message = result.payload || 'Dars ko`chirilmadi';
    const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud/i.test(message);
    if (!isConflict) {
      toast.error(message);
    } else {
      toast.warning("Darsni ko'chirib bo'lmadi: vaqt to'qnashuvi");
    }
    return { ok: false, isConflict, message };
  }

  const headerStats = useMemo(
    () => [
      { label: 'Teacherlar', value: teachers.total || 0 },
      { label: 'Studentlar', value: students.total || 0 },
      { label: 'Sinflar', value: classrooms.items.length || 0 },
    ],
    [teachers.total, students.total, classrooms.items.length],
  );

  const showStatsSection = isDashboardSection;
  const showTeacherSection = isTeachersSection;
  const showSubjectsSection = isSubjectsSection;
  const showStudentSection = isStudentsSection;
  const showClassroomSection = isClassroomsSection;
  const showScheduleSection = isJadvalSection;

  return (
    <div className="space-y-6">
      <CredentialsModal
        open={credentialsModal.open}
        data={credentialsModal.data}
        onClose={() => setCredentialsModal({ open: false, data: null })}
      />

      {showStatsSection && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {headerStats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-300">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
              <div className="mt-2">
                <Badge>{stat.label}</Badge>
              </div>
            </div>
          ))}
        </section>
      )}

      {showTeacherSection && (<CreatePersonPanel
        loading={actionLoading}
        subjects={subjects.items}
        classrooms={classrooms.items}
        onCreateTeacher={handleCreateTeacher}
        onCreateStudent={handleCreateStudent}
        mode="teacher"
      />)}

      {showSubjectsSection && (<SubjectManager
        subjects={subjects.items}
        loading={subjects.loading}
        actionLoading={actionLoading}
        onCreateSubject={handleCreateSubject}
        onDeleteSubject={handleDeleteSubject}
      />)}

      {showStudentSection && (<CreatePersonPanel
        loading={actionLoading}
        subjects={subjects.items}
        classrooms={classrooms.items}
        onCreateTeacher={handleCreateTeacher}
        onCreateStudent={handleCreateStudent}
        mode="student"
      />)}

      {showClassroomSection && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Sinflar boshqaruvi</h3>
          <p className="mt-1 text-sm text-slate-500">
            Bu bo'limda yangi sinf qo'shish va mavjud sinflarni boshqarish mumkin.
          </p>
        </Card>
      )}

      {showClassroomSection && (<ClassroomManager
        classrooms={classrooms.items}
        loading={classrooms.loading}
        actionLoading={actionLoading}
        onCreateClassroom={handleCreateClassroom}
        onDeleteClassroom={handleDeleteClassroom}
        onOpenStudentDetail={(id) => navigate(`/admin/students/${id}`)}
        onDeleteStudent={handleDeleteStudent}
      />)}

      {showScheduleSection && (<DarsJadvaliManager
        actionLoading={actionLoading}
        classrooms={classrooms.items}
        subjects={subjects.items}
        teachers={teachers.items}
        vaqtOraliqlari={vaqtOraliqlari.items}
        darslar={darsJadvali.items}
        darslarLoading={darsJadvali.loading}
        onCreateVaqtOraliq={handleCreateVaqtOraliq}
        onDeleteVaqtOraliq={handleDeleteVaqtOraliq}
        onCreateDars={handleCreateDars}
        onDeleteDars={handleDeleteDars}
        onMoveDars={handleMoveDars}
      />)}

      {showTeacherSection && (
        <PersonTable
          title="Teacherlar ro'yxati"
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
          filterOptions={subjects.items.map((subject) => ({ value: subject.id, label: subject.name }))}
          sortValue={teacherQuery.sort}
          onSortChange={(sort) => setTeacherQuery((prev) => ({ ...prev, sort, page: 1 }))}
          pageSize={teacherQuery.limit}
          onPageSizeChange={(limit) => setTeacherQuery((prev) => ({ ...prev, limit, page: 1 }))}
          onDelete={handleDeleteTeacher}
          onOpenDetail={(id) => navigate(`/admin/teachers/${id}`)}
        />
      )}

      {showStudentSection && (
        <PersonTable
          title="Studentlar ro'yxati"
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
          filterOptions={classrooms.items.map((classroom) => ({ value: classroom.id, label: `${classroom.name} (${classroom.academicYear})` }))}
          sortValue={studentQuery.sort}
          onSortChange={(sort) => setStudentQuery((prev) => ({ ...prev, sort, page: 1 }))}
          pageSize={studentQuery.limit}
          onPageSizeChange={(limit) => setStudentQuery((prev) => ({ ...prev, limit, page: 1 }))}
          onDelete={handleDeleteStudent}
          onOpenDetail={(id) => navigate(`/admin/students/${id}`)}
        />
      )}

      {isDashboardSection && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-slate-900">Dashboard</h3>
          <p className="mt-2 text-sm text-slate-600">
            Bu sahifada faqat umumiy statistika ko'rsatiladi. Amallarni chap menudan tanlang:
            Teachers, Students yoki Dars Jadvali.
          </p>
        </Card>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={() => handleConfirmClose(false)}
        onConfirm={() => handleConfirmClose(true)}
      />
    </div>
  );
}

