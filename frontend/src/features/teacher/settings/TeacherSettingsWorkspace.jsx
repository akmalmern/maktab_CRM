import { Card, Button, ConfirmModal, Input, StateView } from '../../../components/ui';
import useTeacherSettingsController from './useTeacherSettingsController';

export default function TeacherSettingsWorkspace() {
  const vm = useTeacherSettingsController();

  if (vm.loading) {
    return <StateView type="loading" />;
  }

  if (vm.error) {
    return <StateView type="error" description={vm.error} />;
  }

  return (
    <div className="space-y-4">
      <Card
        title={vm.t('Profil sozlamalari')}
        subtitle={vm.t("Avatar, telefon va parolni shu bo'limda boshqarishingiz mumkin.")}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-2xl font-bold text-slate-600 shadow-inner">
              {vm.avatarUrl ? (
                <img src={vm.avatarUrl} alt="teacher avatar" className="h-full w-full object-cover" />
              ) : (
                vm.initials
              )}
            </div>
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-slate-900">{vm.profile?.fullName || '-'}</p>
              <p className="text-sm text-slate-500">@{vm.profile?.username || '-'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {vm.t('Fan')}: {vm.profile?.subject?.name || '-'}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {vm.t('Avatar fayli')}
                </span>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => vm.setAvatarFile(event.target.files?.[0] || null)} />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" variant="indigo" onClick={vm.handleUploadAvatar} disabled={vm.actionLoading}>
                  {vm.t('Avatar yuklash')}
                </Button>
                <Button className="flex-1" variant="danger" onClick={vm.handleDeleteAvatar} disabled={vm.actionLoading || !vm.avatarUrl}>
                  {vm.t("Avatarni o'chirish")}
                </Button>
              </div>
              {vm.avatarFile ? (
                <p className="text-xs text-slate-500">
                  {vm.t('Tanlangan fayl')}: <b>{vm.avatarFile.name}</b>
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <Card title={vm.t('Kontakt ma`lumotlari')} subtitle={vm.t("Joriy telefon raqamingiz doim aktual bo'lishi kerak.")}>
              <form className="space-y-3" onSubmit={vm.handleSavePhone}>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {vm.t('Telefon')}
                  </span>
                  <Input value={vm.phoneDraft} onChange={(event) => vm.setPhoneDraft(event.target.value)} placeholder="+998 90 123 45 67" />
                </label>
                <div className="flex justify-end">
                  <Button type="submit" variant="success" disabled={vm.actionLoading || !vm.canSavePhone}>
                    {vm.t('Telefonni saqlash')}
                  </Button>
                </div>
              </form>
            </Card>

            <Card title={vm.t('Parolni almashtirish')} subtitle={vm.t('Xavfsizlik uchun joriy parolni kiriting va yangi parolni tasdiqlang.')}>
              <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={vm.handleChangePassword}>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {vm.t('Joriy parol')}
                  </span>
                  <Input
                    type="password"
                    value={vm.passwordForm.currentPassword}
                    onChange={(event) =>
                      vm.setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {vm.t('Yangi parol')}
                  </span>
                  <Input
                    type="password"
                    value={vm.passwordForm.newPassword}
                    onChange={(event) =>
                      vm.setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {vm.t('Yangi parol tasdig`i')}
                  </span>
                  <Input
                    type="password"
                    value={vm.passwordForm.confirmPassword}
                    onChange={(event) =>
                      vm.setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                  />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" variant="indigo" disabled={vm.actionLoading || !vm.canSubmitPassword}>
                    {vm.t('Parolni yangilash')}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </Card>

      <ConfirmModal {...vm.confirmModalProps} loading={vm.actionLoading} />
    </div>
  );
}
