import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import useAsyncConfirm from '../../../hooks/useAsyncConfirm';
import {
  useChangeTeacherPasswordMutation,
  useDeleteTeacherAvatarMutation,
  useGetTeacherProfileQuery,
  useUpdateTeacherProfileMutation,
  useUploadTeacherAvatarMutation,
} from '../../../services/api/teacherApi';
import { getInitials, resolveAssetUrl } from './teacherSettingsModel';

function createPasswordForm() {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

export default function useTeacherSettingsController() {
  const { t } = useTranslation();
  const { askConfirm, confirmModalProps } = useAsyncConfirm();
  const profileQuery = useGetTeacherProfileQuery();
  const [updateTeacherProfile, updateTeacherProfileState] = useUpdateTeacherProfileMutation();
  const [changeTeacherPassword, changeTeacherPasswordState] = useChangeTeacherPasswordMutation();
  const [uploadTeacherAvatar, uploadTeacherAvatarState] = useUploadTeacherAvatarMutation();
  const [deleteTeacherAvatar, deleteTeacherAvatarState] = useDeleteTeacherAvatarMutation();
  const [phoneOverride, setPhoneOverride] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [passwordForm, setPasswordForm] = useState(createPasswordForm);

  const profile = profileQuery.data?.profile || null;
  const loading = profileQuery.isLoading || profileQuery.isFetching;
  const error = profileQuery.error?.message || '';
  const avatarUrl = profile?.avatarPath ? resolveAssetUrl(profile.avatarPath) : '';
  const initials = getInitials(profile?.fullName || profile?.username || '');
  const profilePhone = String(profile?.phone || '');
  const phoneDraft = phoneOverride ?? profilePhone;

  const actionLoading =
    updateTeacherProfileState.isLoading ||
    changeTeacherPasswordState.isLoading ||
    uploadTeacherAvatarState.isLoading ||
    deleteTeacherAvatarState.isLoading;

  const canSavePhone = useMemo(
    () => String(phoneDraft || '').trim() && String(phoneDraft || '').trim() !== profilePhone.trim(),
    [phoneDraft, profilePhone],
  );

  const canSubmitPassword = useMemo(() => {
    const currentPassword = String(passwordForm.currentPassword || '');
    const newPassword = String(passwordForm.newPassword || '');
    const confirmPassword = String(passwordForm.confirmPassword || '');
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length >= 8 &&
      newPassword === confirmPassword &&
      newPassword !== currentPassword
    );
  }, [passwordForm]);

  async function handleSavePhone(event) {
    event.preventDefault();
    const phone = String(phoneDraft || '').trim();
    if (!phone) {
      toast.warning(t('Telefon majburiy'));
      return;
    }

    try {
      const payload = await updateTeacherProfile({ phone }).unwrap();
      setPhoneOverride(null);
      toast.success(payload?.message || t('Profil yangilandi'));
    } catch (updateError) {
      toast.error(updateError?.message || t('Profil yangilanmadi'));
    }
  }

  async function handleUploadAvatar() {
    if (!avatarFile) {
      toast.warning(t('Avatar faylini tanlang'));
      return;
    }

    try {
      const payload = await uploadTeacherAvatar({ file: avatarFile }).unwrap();
      toast.success(payload?.message || t('Avatar yangilandi'));
      setAvatarFile(null);
    } catch (uploadError) {
      toast.error(uploadError?.message || t('Avatar yuklanmadi'));
    }
  }

  async function handleDeleteAvatar() {
    const confirmed = await askConfirm({
      title: t("Avatarni o'chirish"),
      message: t("Avatar o'chirilsinmi?"),
      confirmLabel: t("O'chirish"),
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      const payload = await deleteTeacherAvatar().unwrap();
      toast.success(payload?.message || t("Avatar o'chirildi"));
      setAvatarFile(null);
    } catch (deleteError) {
      toast.error(deleteError?.message || t("Avatar o'chirilmadi"));
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();

    if (String(passwordForm.newPassword || '').length < 8) {
      toast.warning(t("Yangi parol kamida 8 ta belgi bo'lishi kerak"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.warning(t('Parol tasdig`i mos emas'));
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.warning(t('Yangi parol eski paroldan farq qilishi kerak'));
      return;
    }

    try {
      const payload = await changeTeacherPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();
      toast.success(payload?.message || t('Parol yangilandi'));
      setPasswordForm(createPasswordForm());
    } catch (passwordError) {
      toast.error(passwordError?.message || t('Parol yangilanmadi'));
    }
  }

  return {
    t,
    profile,
    loading,
    error,
    actionLoading,
    avatarUrl,
    initials,
    phoneDraft,
    setPhoneDraft: setPhoneOverride,
    canSavePhone,
    avatarFile,
    setAvatarFile,
    passwordForm,
    setPasswordForm,
    canSubmitPassword,
    handleSavePhone,
    handleUploadAvatar,
    handleDeleteAvatar,
    handleChangePassword,
    confirmModalProps,
  };
}
