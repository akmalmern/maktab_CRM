import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button, Card, ConfirmModal, DataTable, Input, Select } from '../components/ui';
import {
  deleteAvatarThunk,
  deleteDocumentThunk,
  downloadDocumentThunk,
  fetchPersonDetailThunk,
  updateDocumentThunk,
  uploadAvatarThunk,
  uploadDocumentThunk,
} from '../features/admin/adminSlice';

const DOC_KINDS = ['PASSPORT', 'CONTRACT', 'CERTIFICATE', 'DIPLOMA', 'MEDICAL', 'OTHER'];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('uz-UZ');
}

function formatBytes(bytes) {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < sizes.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(1)} ${sizes[i]}`;
}

function resolveAssetUrl(filePath) {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return `${base}${filePath}`;
}

export default function PersonDetailPage() {
  const { teacherId, studentId } = useParams();
  const type = teacherId ? 'teacher' : 'student';
  const id = teacherId || studentId;

  const dispatch = useAppDispatch();
  const { detail, actionLoading } = useAppSelector((state) => state.admin);
  const confirmResolverRef = useRef(null);

  const [docForm, setDocForm] = useState({ kind: 'OTHER', title: '', file: null });
  const [avatarFile, setAvatarFile] = useState(null);
  const [editDocId, setEditDocId] = useState(null);
  const [editForm, setEditForm] = useState({ kind: 'OTHER', title: '' });
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Tasdiqlash',
    message: '',
  });

  async function loadDetail() {
    const result = await dispatch(fetchPersonDetailThunk({ type, id }));
    if (fetchPersonDetailThunk.rejected.match(result)) {
      toast.error(result.payload || 'Batafsil ma`lumot olinmadi');
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  useEffect(
    () => () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
        confirmResolverRef.current = null;
      }
    },
    [],
  );

  const person = detail.data;
  const avatarUrl = person?.avatarPath ? resolveAssetUrl(person.avatarPath) : '';

  const fullName = useMemo(() => {
    if (!person) return '-';
    return `${person.firstName} ${person.lastName}`;
  }, [person]);
  const backLink = type === 'teacher' ? '/admin/teachers' : '/admin/students';

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

  async function handleUploadDocument(e) {
    e.preventDefault();
    if (!docForm.file) {
      toast.warning('Fayl tanlang');
      return;
    }

    const result = await dispatch(
      uploadDocumentThunk({
        ownerType: type,
        ownerId: id,
        file: docForm.file,
        kind: docForm.kind,
        title: docForm.title,
      }),
    );

    if (uploadDocumentThunk.fulfilled.match(result)) {
      toast.success('Hujjat yuklandi');
      setDocForm({ kind: 'OTHER', title: '', file: null });
      await loadDetail();
    } else {
      toast.error(result.payload || 'Yuklashda xatolik');
    }
  }

  async function handleDeleteDocument(docId) {
    const ok = await askConfirm('Hujjat o`chirilsinmi?', "Hujjatni o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteDocumentThunk(docId));
    if (deleteDocumentThunk.fulfilled.match(result)) {
      toast.success('Hujjat o`chirildi');
      await loadDetail();
    } else {
      toast.error(result.payload || 'Hujjat o`chirilmadi');
    }
  }

  async function handleSaveDocument() {
    const result = await dispatch(
      updateDocumentThunk({ id: editDocId, kind: editForm.kind, title: editForm.title }),
    );

    if (updateDocumentThunk.fulfilled.match(result)) {
      toast.success('Hujjat yangilandi');
      setEditDocId(null);
      await loadDetail();
    } else {
      toast.error(result.payload || 'Hujjat yangilanmadi');
    }
  }

  async function handleDownload(doc) {
    const result = await dispatch(downloadDocumentThunk({ id: doc.id, fileName: doc.fileName }));

    if (downloadDocumentThunk.rejected.match(result)) {
      toast.error(result.payload || 'Yuklab bo`lmadi');
    }
  }

  async function handleUploadAvatar() {
    if (!avatarFile || !person?.user?.id) {
      toast.warning('Avatar faylini tanlang');
      return;
    }

    const result = await dispatch(
      uploadAvatarThunk({
        userId: person.user.id,
        file: avatarFile,
      }),
    );

    if (uploadAvatarThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || 'Avatar yangilandi');
      setAvatarFile(null);
      await loadDetail();
    } else {
      toast.error(result.payload || 'Avatar yuklanmadi');
    }
  }

  async function handleDeleteAvatar() {
    if (!person?.user?.id) return;

    const ok = await askConfirm('Avatar o`chirilsinmi?', "Avatarni o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteAvatarThunk({ userId: person.user.id }));
    if (deleteAvatarThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || 'Avatar o`chirildi');
      await loadDetail();
    } else {
      toast.error(result.payload || 'Avatar o`chirilmadi');
    }
  }

  if (detail.loading) {
    return <Card className="p-8 text-center text-slate-500">Yuklanmoqda...</Card>;
  }

  if (detail.error) {
    return <Card className="p-8 text-center text-rose-600">{detail.error}</Card>;
  }

  if (!person) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={backLink} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {'<-'} Ro'yxatga qaytish
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{fullName}</h2>
          <p className="text-sm text-slate-500">{type === 'teacher' ? 'Teacher profili' : 'Student profili'}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Avatar</h4>
            <div className="mb-3 h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-contain bg-white" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Avatar yo`q</div>
              )}
            </div>

            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />

            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleUploadAvatar}
                disabled={actionLoading}
                size="sm"
                variant="indigo"
              >
                Avatar yuklash
              </Button>
              <Button
                onClick={handleDeleteAvatar}
                disabled={actionLoading}
                size="sm"
                variant="danger"
              >
                Avatar o`chirish
              </Button>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-lg font-semibold text-slate-900">Profil</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Username:</span> {person.user?.username || '-'}
              </p>
              <p>
                <span className="font-semibold">Telefon:</span> {person.user?.phone || '-'}
              </p>
              <p>
                <span className="font-semibold">Manzil:</span> {person.yashashManzili || '-'}
              </p>
              <p>
                <span className="font-semibold">Tug`ilgan sana:</span> {formatDate(person.birthDate)}
              </p>
              {type === 'teacher' && (
                <p>
                  <span className="font-semibold">Fan:</span> {person.subject?.name || '-'}
                </p>
              )}
              {type === 'student' && (
                <>
                  <p>
                    <span className="font-semibold">Sinf:</span>{' '}
                    {person.enrollments?.[0]?.classroom
                      ? `${person.enrollments[0].classroom.name} (${person.enrollments[0].classroom.academicYear})`
                      : '-'}
                  </p>
                  <p>
                    <span className="font-semibold">Ota-ona telefoni:</span> {person.parentPhone || '-'}
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Hujjatlar</h3>

          <form onSubmit={handleUploadDocument} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <Select
              value={docForm.kind}
              onChange={(e) => setDocForm((prev) => ({ ...prev, kind: e.target.value }))}
            >
              {DOC_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>

            <Input
              type="text"
              value={docForm.title}
              onChange={(e) => setDocForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Sarlavha"
            />

            <Input
              type="file"
              onChange={(e) => setDocForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />

            <Button
              type="submit"
              disabled={actionLoading}
              variant="success"
            >
              Hujjat qo`shish
            </Button>
          </form>

          <div className="mt-4">
            <DataTable
              rows={person.documents || []}
              emptyText="Hujjatlar mavjud emas"
              columns={[
                { key: 'title', header: 'Nomi', render: (doc) => doc.title || doc.fileName },
                { key: 'kind', header: 'Turi', render: (doc) => doc.kind },
                { key: 'sizeBytes', header: 'Hajmi', render: (doc) => formatBytes(doc.sizeBytes) },
                { key: 'createdAt', header: 'Sana', render: (doc) => formatDate(doc.createdAt) },
                {
                  key: 'actions',
                  header: 'Amallar',
                  render: (doc) => (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleDownload(doc)}>
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="indigo"
                        onClick={() => {
                          setEditDocId(doc.id);
                          setEditForm({ kind: doc.kind || 'OTHER', title: doc.title || '' });
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteDocument(doc.id)}>
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {editDocId && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="mb-2 text-sm font-semibold text-amber-800">Hujjatni yangilash</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Select
                  value={editForm.kind}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, kind: e.target.value }))}
                >
                  {DOC_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </Select>

                <Input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Yangi sarlavha"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDocument}
                    disabled={actionLoading}
                    variant="success"
                  >
                    Saqlash
                  </Button>
                  <Button
                    onClick={() => setEditDocId(null)}
                    variant="secondary"
                  >
                    Bekor qilish
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

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
