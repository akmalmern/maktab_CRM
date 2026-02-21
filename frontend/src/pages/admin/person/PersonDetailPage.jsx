import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  Button,
  Card,
  ConfirmModal,
  DataTable,
  Input,
  Select,
  StateView,
  Tabs,
} from '../../../components/ui';
import {
  deleteAvatarThunk,
  deleteDocumentThunk,
  downloadDocumentThunk,
  fetchPersonDetailThunk,
  resetPersonPasswordThunk,
  updateDocumentThunk,
  uploadAvatarThunk,
  uploadDocumentThunk,
} from '../../../features/admin/shared';

const DOC_KINDS = ['PASSPORT', 'CONTRACT', 'CERTIFICATE', 'DIPLOMA', 'MEDICAL', 'OTHER'];

function formatDate(value, language = 'uz') {
  if (!value) return '-';
  const localeByLanguage = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  };
  return new Date(value).toLocaleDateString(localeByLanguage[language] || 'uz-UZ');
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
  const { t, i18n } = useTranslation();
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
  const [activeTab, setActiveTab] = useState('profile');
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
  });

  async function loadDetail() {
    const result = await dispatch(fetchPersonDetailThunk({ type, id }));
    if (fetchPersonDetailThunk.rejected.match(result)) {
      toast.error(
        result.payload || t('Batafsil ma`lumot olinmadi', { defaultValue: 'Batafsil ma`lumot olinmadi' }),
      );
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

  function askConfirm(message, title = t('Tasdiqlash', { defaultValue: 'Tasdiqlash' })) {
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
      toast.warning(t('Fayl tanlang', { defaultValue: 'Fayl tanlang' }));
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
      toast.success(t('Hujjat yuklandi', { defaultValue: 'Hujjat yuklandi' }));
      setDocForm({ kind: 'OTHER', title: '', file: null });
      await loadDetail();
    } else {
      toast.error(result.payload || t('Yuklashda xatolik', { defaultValue: 'Yuklashda xatolik' }));
    }
  }

  async function handleDeleteDocument(docId) {
    const ok = await askConfirm(
      t('Hujjat o`chirilsinmi?', { defaultValue: 'Hujjat o`chirilsinmi?' }),
      t("Hujjatni o'chirish", { defaultValue: "Hujjatni o'chirish" }),
    );
    if (!ok) return;

    const result = await dispatch(deleteDocumentThunk(docId));
    if (deleteDocumentThunk.fulfilled.match(result)) {
      toast.success(t('Hujjat o`chirildi', { defaultValue: 'Hujjat o`chirildi' }));
      await loadDetail();
    } else {
      toast.error(result.payload || t('Hujjat o`chirilmadi', { defaultValue: 'Hujjat o`chirilmadi' }));
    }
  }

  async function handleSaveDocument() {
    const result = await dispatch(
      updateDocumentThunk({ id: editDocId, kind: editForm.kind, title: editForm.title }),
    );

    if (updateDocumentThunk.fulfilled.match(result)) {
      toast.success(t('Hujjat yangilandi', { defaultValue: 'Hujjat yangilandi' }));
      setEditDocId(null);
      await loadDetail();
    } else {
      toast.error(result.payload || t('Hujjat yangilanmadi', { defaultValue: 'Hujjat yangilanmadi' }));
    }
  }

  async function handleDownload(doc) {
    const result = await dispatch(downloadDocumentThunk({ id: doc.id, fileName: doc.fileName }));

    if (downloadDocumentThunk.rejected.match(result)) {
      toast.error(result.payload || t('Yuklab bo`lmadi', { defaultValue: 'Yuklab bo`lmadi' }));
    }
  }

  async function handleUploadAvatar() {
    if (!avatarFile || !person?.user?.id) {
      toast.warning(t('Avatar faylini tanlang', { defaultValue: 'Avatar faylini tanlang' }));
      return;
    }

    const result = await dispatch(
      uploadAvatarThunk({
        userId: person.user.id,
        file: avatarFile,
      }),
    );

    if (uploadAvatarThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || t('Avatar yangilandi', { defaultValue: 'Avatar yangilandi' }));
      setAvatarFile(null);
      await loadDetail();
    } else {
      toast.error(result.payload || t('Avatar yuklanmadi', { defaultValue: 'Avatar yuklanmadi' }));
    }
  }

  async function handleDeleteAvatar() {
    if (!person?.user?.id) return;

    const ok = await askConfirm(
      t('Avatar o`chirilsinmi?', { defaultValue: 'Avatar o`chirilsinmi?' }),
      t("Avatarni o'chirish", { defaultValue: "Avatarni o'chirish" }),
    );
    if (!ok) return;

    const result = await dispatch(deleteAvatarThunk({ userId: person.user.id }));
    if (deleteAvatarThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || t('Avatar o`chirildi', { defaultValue: 'Avatar o`chirildi' }));
      await loadDetail();
    } else {
      toast.error(result.payload || t('Avatar o`chirilmadi', { defaultValue: 'Avatar o`chirilmadi' }));
    }
  }

  async function handleResetPassword() {
    const newPassword = window.prompt(
      t('Yangi parol kiriting (kamida 8 ta belgi):', {
        defaultValue: 'Yangi parol kiriting (kamida 8 ta belgi):',
      }),
      '',
    );
    if (newPassword === null) return;
    if (String(newPassword).trim().length < 8) {
      toast.warning(
        t("Parol kamida 8 ta belgidan iborat bo'lishi kerak", {
          defaultValue: "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
        }),
      );
      return;
    }

    const ok = await askConfirm(
      t("Kiritilgan yangi parol saqlansinmi? Eski parol endi ishlamaydi.", {
        defaultValue: "Kiritilgan yangi parol saqlansinmi? Eski parol endi ishlamaydi.",
      }),
      t('Parolni yangilash', { defaultValue: 'Parolni yangilash' }),
    );
    if (!ok) return;

    const result = await dispatch(resetPersonPasswordThunk({ type, id, newPassword }));
    if (resetPersonPasswordThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || t('Parol yangilandi', { defaultValue: 'Parol yangilandi' }));
      return;
    }

    toast.error(result.payload || t('Parol yangilanmadi', { defaultValue: 'Parol yangilanmadi' }));
  }

  if (detail.loading) return <StateView type="skeleton" />;
  if (detail.error) return <Card className="p-8 text-center text-rose-600">{detail.error}</Card>;
  if (!person) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={backLink} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {'<-'} {t("Ro'yxatga qaytish", { defaultValue: "Ro'yxatga qaytish" })}
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{fullName}</h2>
          <p className="text-sm text-slate-500">
            {type === 'teacher'
              ? t('Teacher profili', { defaultValue: 'Teacher profili' })
              : t('Student profili', { defaultValue: 'Student profili' })}
          </p>
        </div>
        <Tabs
          items={[
            { value: 'profile', label: t('Profil', { defaultValue: 'Profil' }) },
            { value: 'documents', label: t('Hujjatlar', { defaultValue: 'Hujjatlar' }) },
            { value: 'activity', label: t('Faoliyat', { defaultValue: 'Faoliyat' }) },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'profile' && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h4 className="mb-2 text-sm font-semibold text-slate-800">
              {t('Avatar', { defaultValue: 'Avatar' })}
            </h4>
            <div className="mb-3 h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={t('Avatar', { defaultValue: 'Avatar' })}
                  className="h-full w-full object-contain bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  {t('Avatar yo`q', { defaultValue: 'Avatar yo`q' })}
                </div>
              )}
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={handleUploadAvatar} disabled={actionLoading} size="sm" variant="indigo">
                {t('Avatar yuklash', { defaultValue: 'Avatar yuklash' })}
              </Button>
              <Button onClick={handleDeleteAvatar} disabled={actionLoading} size="sm" variant="danger">
                {t('Avatar o`chirish', { defaultValue: 'Avatar o`chirish' })}
              </Button>
            </div>
          </Card>

          <Card
            className="lg:col-span-2"
            title={t("Profil ma'lumotlari", { defaultValue: "Profil ma'lumotlari" })}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <p>
                <span className="font-semibold">{t('Username', { defaultValue: 'Username' })}:</span>{' '}
                {person.user?.username || '-'}
              </p>
              <div className="md:col-span-1">
                <Button size="sm" variant="indigo" onClick={handleResetPassword} disabled={actionLoading}>
                  {t('Parolni yangilash', { defaultValue: 'Parolni yangilash' })}
                </Button>
              </div>
              <p>
                <span className="font-semibold">{t('Telefon', { defaultValue: 'Telefon' })}:</span>{' '}
                {person.user?.phone || '-'}
              </p>
              <p>
                <span className="font-semibold">{t('Yashash manzili', { defaultValue: 'Yashash manzili' })}:</span>{' '}
                {person.yashashManzili || '-'}
              </p>
              <p>
                <span className="font-semibold">
                  {t('Tug`ilgan sana', { defaultValue: 'Tug`ilgan sana' })}:
                </span>{' '}
                {formatDate(person.birthDate, i18n.language)}
              </p>
              {type === 'teacher' && (
                <p>
                  <span className="font-semibold">{t('Fan', { defaultValue: 'Fan' })}:</span>{' '}
                  {person.subject?.name || '-'}
                </p>
              )}
              {type === 'student' && (
                <>
                  <p>
                    <span className="font-semibold">{t('Sinf', { defaultValue: 'Sinf' })}:</span>{' '}
                    {person.enrollments?.[0]?.classroom
                      ? `${person.enrollments[0].classroom.name} (${person.enrollments[0].classroom.academicYear})`
                      : '-'}
                  </p>
                  <p>
                    <span className="font-semibold">
                      {t('Ota-ona telefoni', { defaultValue: 'Ota-ona telefoni' })}:
                    </span>{' '}
                    {person.parentPhone || '-'}
                  </p>
                </>
              )}
            </div>
          </Card>
        </section>
      )}

      {activeTab === 'documents' && (
        <Card title={t('Hujjatlar', { defaultValue: 'Hujjatlar' })}>
          <form
            onSubmit={handleUploadDocument}
            className="mt-1 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4"
          >
            <Select value={docForm.kind} onChange={(e) => setDocForm((prev) => ({ ...prev, kind: e.target.value }))}>
              {DOC_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(kind, { defaultValue: kind })}
                </option>
              ))}
            </Select>
            <Input
              type="text"
              value={docForm.title}
              onChange={(e) => setDocForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t('Sarlavha', { defaultValue: 'Sarlavha' })}
            />
            <Input
              type="file"
              onChange={(e) => setDocForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            <Button type="submit" disabled={actionLoading} variant="success">
              {t('Hujjat qo`shish', { defaultValue: 'Hujjat qo`shish' })}
            </Button>
          </form>

          <div className="mt-4">
            <DataTable
              rows={person.documents || []}
              emptyText={t('Hujjatlar mavjud emas', { defaultValue: 'Hujjatlar mavjud emas' })}
              columns={[
                {
                  key: 'title',
                  header: t('Nomi', { defaultValue: 'Nomi' }),
                  render: (doc) => doc.title || doc.fileName,
                },
                { key: 'kind', header: t('Turi', { defaultValue: 'Turi' }), render: (doc) => doc.kind },
                { key: 'sizeBytes', header: t('Hajmi', { defaultValue: 'Hajmi' }), render: (doc) => formatBytes(doc.sizeBytes) },
                {
                  key: 'createdAt',
                  header: t('Sana', { defaultValue: 'Sana' }),
                  render: (doc) => formatDate(doc.createdAt, i18n.language),
                },
                {
                  key: 'actions',
                  header: t('Amallar', { defaultValue: 'Amallar' }),
                  render: (doc) => (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleDownload(doc)}>
                        {t('Yuklab olish', { defaultValue: 'Yuklab olish' })}
                      </Button>
                      <Button
                        size="sm"
                        variant="indigo"
                        onClick={() => {
                          setEditDocId(doc.id);
                          setEditForm({ kind: doc.kind || 'OTHER', title: doc.title || '' });
                        }}
                      >
                        {t('Tahrirlash', { defaultValue: 'Tahrirlash' })}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteDocument(doc.id)}>
                        {t("O'chirish", { defaultValue: "O'chirish" })}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {editDocId && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="mb-2 text-sm font-semibold text-amber-800">
                {t('Hujjatni yangilash', { defaultValue: 'Hujjatni yangilash' })}
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Select value={editForm.kind} onChange={(e) => setEditForm((prev) => ({ ...prev, kind: e.target.value }))}>
                  {DOC_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(kind, { defaultValue: kind })}
                    </option>
                  ))}
                </Select>
                <Input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t('Yangi sarlavha', { defaultValue: 'Yangi sarlavha' })}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveDocument} disabled={actionLoading} variant="success">
                    {t('Saqlash', { defaultValue: 'Saqlash' })}
                  </Button>
                  <Button onClick={() => setEditDocId(null)} variant="secondary">
                    {t('Bekor qilish', { defaultValue: 'Bekor qilish' })}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card title={t('Faoliyat', { defaultValue: 'Faoliyat' })}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('Profil yaratilgan sana', { defaultValue: 'Profil yaratilgan sana' })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(person.createdAt || person.user?.createdAt, i18n.language)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('Jami hujjatlar', { defaultValue: 'Jami hujjatlar' })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {person.documents?.length || 0} {t('ta', { defaultValue: 'ta' })}
              </p>
            </div>
          </div>
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
