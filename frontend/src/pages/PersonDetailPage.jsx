import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../app/hooks';
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

  const [docForm, setDocForm] = useState({ kind: 'OTHER', title: '', file: null });
  const [avatarFile, setAvatarFile] = useState(null);
  const [editDocId, setEditDocId] = useState(null);
  const [editForm, setEditForm] = useState({ kind: 'OTHER', title: '' });

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

  const person = detail.data;
  const avatarUrl = person?.avatarPath ? resolveAssetUrl(person.avatarPath) : '';

  const fullName = useMemo(() => {
    if (!person) return '-';
    return `${person.firstName} ${person.lastName}`;
  }, [person]);

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
    const ok = window.confirm('Hujjat o`chirilsinmi?');
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

    const ok = window.confirm('Avatar o`chirilsinmi?');
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
    return <div className="rounded-xl bg-white p-8 text-center text-slate-500">Yuklanmoqda...</div>;
  }

  if (detail.error) {
    return <div className="rounded-xl bg-white p-8 text-center text-rose-600">{detail.error}</div>;
  }

  if (!person) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {'<-'} Dashboardga qaytish
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{fullName}</h2>
          <p className="text-sm text-slate-500">{type === 'teacher' ? 'Teacher profili' : 'Student profili'}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Avatar</h4>
            <div className="mb-3 h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-contain bg-white" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Avatar yo`q</div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleUploadAvatar}
                disabled={actionLoading}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Avatar yuklash
              </button>
              <button
                onClick={handleDeleteAvatar}
                disabled={actionLoading}
                className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Avatar o`chirish
              </button>
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
                  <span className="font-semibold">Mutaxassislik:</span> {person.specialization || '-'}
                </p>
              )}
              {type === 'student' && (
                <p>
                  <span className="font-semibold">Ota-ona telefoni:</span> {person.parentPhone || '-'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Hujjatlar</h3>

          <form onSubmit={handleUploadDocument} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <select
              value={docForm.kind}
              onChange={(e) => setDocForm((prev) => ({ ...prev, kind: e.target.value }))}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            >
              {DOC_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={docForm.title}
              onChange={(e) => setDocForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Sarlavha"
              className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            />

            <input
              type="file"
              onChange={(e) => setDocForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
              className="text-sm"
            />

            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Hujjat qo`shish
            </button>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Nomi</th>
                  <th className="px-3 py-2">Turi</th>
                  <th className="px-3 py-2">Hajmi</th>
                  <th className="px-3 py-2">Sana</th>
                  <th className="px-3 py-2">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {(person.documents || []).map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">{doc.title || doc.fileName}</td>
                    <td className="px-3 py-3">{doc.kind}</td>
                    <td className="px-3 py-3">{formatBytes(doc.sizeBytes)}</td>
                    <td className="px-3 py-3">{formatDate(doc.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          Download
                        </button>

                        <button
                          onClick={() => {
                            setEditDocId(doc.id);
                            setEditForm({ kind: doc.kind || 'OTHER', title: doc.title || '' });
                          }}
                          className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!person.documents?.length && (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                      Hujjatlar mavjud emas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {editDocId && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="mb-2 text-sm font-semibold text-amber-800">Hujjatni yangilash</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select
                  value={editForm.kind}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, kind: e.target.value }))}
                  className="rounded-md border border-amber-300 px-2 py-2 text-sm"
                >
                  {DOC_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-md border border-amber-300 px-2 py-2 text-sm"
                  placeholder="Yangi sarlavha"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDocument}
                    disabled={actionLoading}
                    className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Saqlash
                  </button>
                  <button
                    onClick={() => setEditDocId(null)}
                    className="rounded-md border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-700"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
