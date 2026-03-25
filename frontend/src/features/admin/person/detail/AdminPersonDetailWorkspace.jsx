import { Link } from 'react-router-dom';
import {
  Card,
  ConfirmModal,
  PromptModal,
  StateView,
  Tabs,
} from '../../../../components/ui';
import AdminPersonActivityTab from './AdminPersonActivityTab';
import AdminPersonDocumentsTab from './AdminPersonDocumentsTab';
import AdminPersonProfileTab from './AdminPersonProfileTab';
import useAdminPersonDetailController from './useAdminPersonDetailController';

export default function AdminPersonDetailWorkspace() {
  const vm = useAdminPersonDetailController();

  if (vm.detail.loading) return <StateView type="skeleton" />;
  if (vm.detail.error) return <Card className="p-8 text-center text-rose-600">{vm.detail.error}</Card>;
  if (!vm.person) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={vm.backLink} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {'<-'} {vm.t("Ro'yxatga qaytish", { defaultValue: "Ro'yxatga qaytish" })}
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{vm.fullName}</h2>
          <p className="text-sm text-slate-500">
            {vm.type === 'teacher'
              ? vm.t('Teacher profili', { defaultValue: 'Teacher profili' })
              : vm.t('Student profili', { defaultValue: 'Student profili' })}
          </p>
        </div>
        <Tabs
          items={[
            { value: 'profile', label: vm.t('Profil', { defaultValue: 'Profil' }) },
            { value: 'documents', label: vm.t('Hujjatlar', { defaultValue: 'Hujjatlar' }) },
            { value: 'activity', label: vm.t('Faoliyat', { defaultValue: 'Faoliyat' }) },
          ]}
          value={vm.activeTab}
          onChange={vm.setActiveTab}
        />
      </div>

      {vm.activeTab === 'profile' ? (
        <AdminPersonProfileTab
          t={vm.t}
          i18nLanguage={vm.i18nLanguage}
          type={vm.type}
          person={vm.person}
          avatarUrl={vm.avatarUrl}
          actionLoading={vm.actionLoading}
          onAvatarFileChange={vm.setAvatarFile}
          onUploadAvatar={vm.handleUploadAvatar}
          onDeleteAvatar={vm.handleDeleteAvatar}
          onResetPassword={vm.handleResetPassword}
          isArchived={vm.isArchived}
          enrollmentHistory={vm.enrollmentHistory}
          teachingClassrooms={vm.teachingClassrooms}
        />
      ) : null}

      {vm.activeTab === 'documents' ? (
        <AdminPersonDocumentsTab
          t={vm.t}
          i18nLanguage={vm.i18nLanguage}
          person={vm.person}
          docKinds={vm.DOC_KINDS}
          docForm={vm.docForm}
          setDocForm={vm.setDocForm}
          actionLoading={vm.actionLoading}
          onUploadDocument={vm.handleUploadDocument}
          onDownload={vm.handleDownload}
          onDeleteDocument={vm.handleDeleteDocument}
          editDocId={vm.editDocId}
          setEditDocId={vm.setEditDocId}
          editForm={vm.editForm}
          setEditForm={vm.setEditForm}
          onSaveDocument={vm.handleSaveDocument}
        />
      ) : null}

      {vm.activeTab === 'activity' ? (
        <AdminPersonActivityTab
          t={vm.t}
          i18nLanguage={vm.i18nLanguage}
          type={vm.type}
          person={vm.person}
          metrics={vm.metrics}
          recentGrades={vm.recentGrades}
          recentAttendance={vm.recentAttendance}
          recentPayments={vm.recentPayments}
          gradeStats={vm.gradeStats}
          attendanceStats={vm.attendanceStats}
        />
      ) : null}

      <PromptModal
        open={vm.promptState.open}
        title={vm.promptState.title}
        message={vm.promptState.message}
        label={vm.promptState.label}
        placeholder={vm.promptState.placeholder}
        value={vm.promptState.value}
        inputType="password"
        confirmLabel={vm.t('Davom etish', { defaultValue: 'Davom etish' })}
        confirmDisabled={String(vm.promptState.value || '').trim().length < 8}
        onChange={(value) => vm.setPromptState((prev) => ({ ...prev, value }))}
        onCancel={() => vm.handlePromptClose(null)}
        onConfirm={() => vm.handlePromptClose(String(vm.promptState.value || '').trim())}
        loading={vm.actionLoading}
      />

      <ConfirmModal {...vm.confirmModalProps} loading={vm.actionLoading} />
    </div>
  );
}
