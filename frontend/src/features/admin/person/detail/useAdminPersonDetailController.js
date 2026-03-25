import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import useAsyncConfirm from '../../../../hooks/useAsyncConfirm';
import { saveDownloadedFile } from '../../../../lib/downloadUtils';
import {
  useDeleteAdminAvatarMutation,
  useDeleteAdminDocumentMutation,
  useDownloadAdminDocumentMutation,
  useGetAdminPersonDetailQuery,
  useResetAdminPersonPasswordMutation,
  useUpdateAdminDocumentMutation,
  useUploadAdminAvatarMutation,
  useUploadAdminDocumentMutation,
} from '../../../../services/api/personApi';
import {
  DOC_KINDS,
  buildPersonBackLink,
  buildPersonFullName,
  resolveAssetUrl,
} from './adminPersonDetailModel';

export default function useAdminPersonDetailController() {
  const { t, i18n } = useTranslation();
  const { teacherId, studentId } = useParams();
  const type = teacherId ? 'teacher' : 'student';
  const id = teacherId || studentId;
  const promptResolverRef = useRef(null);
  const { askConfirm, confirmModalProps } = useAsyncConfirm();

  const [docForm, setDocForm] = useState({ kind: 'OTHER', title: '', file: null });
  const [avatarFile, setAvatarFile] = useState(null);
  const [editDocId, setEditDocId] = useState(null);
  const [editForm, setEditForm] = useState({ kind: 'OTHER', title: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [promptState, setPromptState] = useState({
    open: false,
    title: '',
    message: '',
    label: '',
    placeholder: '',
    value: '',
  });

  const personQuery = useGetAdminPersonDetailQuery({ type, id }, { skip: !id });
  const [uploadDocument, uploadDocumentState] = useUploadAdminDocumentMutation();
  const [updateDocument, updateDocumentState] = useUpdateAdminDocumentMutation();
  const [deleteDocument, deleteDocumentState] = useDeleteAdminDocumentMutation();
  const [downloadDocument] = useDownloadAdminDocumentMutation();
  const [uploadAvatar, uploadAvatarState] = useUploadAdminAvatarMutation();
  const [deleteAvatar, deleteAvatarState] = useDeleteAdminAvatarMutation();
  const [resetPersonPassword, resetPersonPasswordState] = useResetAdminPersonPasswordMutation();

  const actionLoading =
    uploadDocumentState.isLoading ||
    updateDocumentState.isLoading ||
    deleteDocumentState.isLoading ||
    uploadAvatarState.isLoading ||
    deleteAvatarState.isLoading ||
    resetPersonPasswordState.isLoading;

  const detail = useMemo(
    () => ({
      loading: personQuery.isLoading || personQuery.isFetching,
      error: personQuery.error?.message || null,
      data: personQuery.data?.data || null,
    }),
    [personQuery.data?.data, personQuery.error?.message, personQuery.isFetching, personQuery.isLoading],
  );
  const person = detail.data;
  const avatarUrl = person?.avatarPath ? resolveAssetUrl(person.avatarPath) : '';
  const fullName = useMemo(() => buildPersonFullName(person), [person]);
  const backLink = buildPersonBackLink(type);
  const metrics = person?.activity?.metrics || {};
  const recentGrades = person?.activity?.recentGrades || [];
  const recentAttendance = person?.activity?.recentAttendance || [];
  const recentPayments = person?.activity?.recentPayments || [];
  const gradeStats = person?.activity?.gradeStats || [];
  const attendanceStats = person?.activity?.attendanceStats || [];
  const enrollmentHistory = person?.enrollments || [];
  const teachingClassrooms = person?.teachingClassrooms || [];
  const isArchived = Boolean(person?.user && person.user.isActive === false);

  async function loadDetail() {
    try {
      await personQuery.refetch();
    } catch (error) {
      toast.error(error?.message || t('Batafsil ma`lumot olinmadi', { defaultValue: 'Batafsil ma`lumot olinmadi' }));
    }
  }

  useEffect(
    () => () => {
      if (promptResolverRef.current) {
        promptResolverRef.current(null);
        promptResolverRef.current = null;
      }
    },
    [],
  );

  function askPrompt(options) {
    const next = typeof options === 'string' ? { message: options } : options || {};
    return new Promise((resolve) => {
      promptResolverRef.current = resolve;
      setPromptState({
        open: true,
        title: next.title || '',
        message: next.message || '',
        label: next.label || '',
        placeholder: next.placeholder || '',
        value: next.value || '',
      });
    });
  }

  function handlePromptClose(result) {
    setPromptState((prev) => ({ ...prev, open: false }));
    if (promptResolverRef.current) {
      promptResolverRef.current(result);
      promptResolverRef.current = null;
    }
  }

  async function handleUploadDocument(event) {
    event.preventDefault();
    if (!docForm.file) {
      toast.warning(t('Fayl tanlang', { defaultValue: 'Fayl tanlang' }));
      return;
    }

    try {
      await uploadDocument({
        ownerType: type,
        ownerId: id,
        file: docForm.file,
        kind: docForm.kind,
        title: docForm.title,
      }).unwrap();
      toast.success(t('Hujjat yuklandi', { defaultValue: 'Hujjat yuklandi' }));
      setDocForm({ kind: 'OTHER', title: '', file: null });
      await loadDetail();
    } catch (error) {
      toast.error(error?.message || t('Yuklashda xatolik', { defaultValue: 'Yuklashda xatolik' }));
    }
  }

  async function handleDeleteDocument(docId) {
    const ok = await askConfirm({
      title: t("Hujjatni o'chirish", { defaultValue: "Hujjatni o'chirish" }),
      message: t('Hujjat o`chirilsinmi?', { defaultValue: 'Hujjat o`chirilsinmi?' }),
    });
    if (!ok) return;

    try {
      await deleteDocument(docId).unwrap();
      toast.success(t('Hujjat o`chirildi', { defaultValue: 'Hujjat o`chirildi' }));
      await loadDetail();
    } catch (error) {
      toast.error(error?.message || t('Hujjat o`chirilmadi', { defaultValue: 'Hujjat o`chirilmadi' }));
    }
  }

  async function handleSaveDocument() {
    try {
      await updateDocument({ id: editDocId, kind: editForm.kind, title: editForm.title }).unwrap();
      toast.success(t('Hujjat yangilandi', { defaultValue: 'Hujjat yangilandi' }));
      setEditDocId(null);
      await loadDetail();
    } catch (error) {
      toast.error(error?.message || t('Hujjat yangilanmadi', { defaultValue: 'Hujjat yangilanmadi' }));
    }
  }

  async function handleDownload(doc) {
    try {
      const { blob, fileName } = await downloadDocument({ id: doc.id }).unwrap();
      saveDownloadedFile({ blob, fileName, fallbackName: doc.fileName || 'document' });
    } catch (error) {
      toast.error(error?.message || t('Yuklab bo`lmadi', { defaultValue: 'Yuklab bo`lmadi' }));
    }
  }

  async function handleUploadAvatar() {
    if (!avatarFile || !person?.user?.id) {
      toast.warning(t('Avatar faylini tanlang', { defaultValue: 'Avatar faylini tanlang' }));
      return;
    }

    try {
      const payload = await uploadAvatar({
        userId: person.user.id,
        file: avatarFile,
      }).unwrap();
      toast.success(payload?.message || t('Avatar yangilandi', { defaultValue: 'Avatar yangilandi' }));
      setAvatarFile(null);
      await loadDetail();
    } catch (error) {
      toast.error(error?.message || t('Avatar yuklanmadi', { defaultValue: 'Avatar yuklanmadi' }));
    }
  }

  async function handleDeleteAvatar() {
    if (!person?.user?.id) return;

    const ok = await askConfirm({
      title: t("Avatarni o'chirish", { defaultValue: "Avatarni o'chirish" }),
      message: t('Avatar o`chirilsinmi?', { defaultValue: 'Avatar o`chirilsinmi?' }),
    });
    if (!ok) return;

    try {
      const payload = await deleteAvatar({ userId: person.user.id }).unwrap();
      toast.success(payload?.message || t('Avatar o`chirildi', { defaultValue: 'Avatar o`chirildi' }));
      await loadDetail();
    } catch (error) {
      toast.error(error?.message || t('Avatar o`chirilmadi', { defaultValue: 'Avatar o`chirilmadi' }));
    }
  }

  async function handleResetPassword() {
    const newPassword = await askPrompt({
      title: t('Parolni yangilash', { defaultValue: 'Parolni yangilash' }),
      message: t('Yangi parol kiriting (kamida 8 ta belgi):', {
        defaultValue: 'Yangi parol kiriting (kamida 8 ta belgi):',
      }),
      label: t('Yangi parol', { defaultValue: 'Yangi parol' }),
      placeholder: t('Kamida 8 ta belgi', { defaultValue: 'Kamida 8 ta belgi' }),
    });
    if (newPassword === null) return;
    if (String(newPassword).trim().length < 8) {
      toast.warning(
        t("Parol kamida 8 ta belgidan iborat bo'lishi kerak", {
          defaultValue: "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
        }),
      );
      return;
    }

    const ok = await askConfirm({
      title: t('Parolni yangilash', { defaultValue: 'Parolni yangilash' }),
      message: t("Kiritilgan yangi parol saqlansinmi? Eski parol endi ishlamaydi.", {
        defaultValue: "Kiritilgan yangi parol saqlansinmi? Eski parol endi ishlamaydi.",
      }),
      confirmLabel: t('Saqlash', { defaultValue: 'Saqlash' }),
      confirmVariant: 'success',
    });
    if (!ok) return;

    try {
      const payload = await resetPersonPassword({ type, id, newPassword }).unwrap();
      toast.success(payload?.message || t('Parol yangilandi', { defaultValue: 'Parol yangilandi' }));
    } catch (error) {
      toast.error(error?.message || t('Parol yangilanmadi', { defaultValue: 'Parol yangilanmadi' }));
    }
  }

  return {
    t,
    i18nLanguage: i18n.language,
    type,
    id,
    DOC_KINDS,
    detail,
    person,
    avatarUrl,
    fullName,
    backLink,
    isArchived,
    activeTab,
    setActiveTab,
    docForm,
    setDocForm,
    avatarFile,
    setAvatarFile,
    editDocId,
    setEditDocId,
    editForm,
    setEditForm,
    promptState,
    setPromptState,
    handlePromptClose,
    confirmModalProps,
    actionLoading,
    handleUploadDocument,
    handleDeleteDocument,
    handleSaveDocument,
    handleDownload,
    handleUploadAvatar,
    handleDeleteAvatar,
    handleResetPassword,
    metrics,
    recentGrades,
    recentAttendance,
    recentPayments,
    gradeStats,
    attendanceStats,
    enrollmentHistory,
    teachingClassrooms,
  };
}
