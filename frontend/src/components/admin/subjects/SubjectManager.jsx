import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Badge, Button, Card, DataTable, Input, StateView } from '../../../components/ui';
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useGetSubjectsQuery,
} from '../../../services/api/subjectsApi';

export default function SubjectManager() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const { data, isLoading, isFetching, error } = useGetSubjectsQuery();
  const [createSubject, createState] = useCreateSubjectMutation();
  const [deleteSubject, deleteState] = useDeleteSubjectMutation();

  const subjects = data?.subjects || [];
  const loading = isLoading || isFetching;
  const actionLoading = createState.isLoading || deleteState.isLoading;

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await createSubject({ name }).unwrap();
      toast.success(t('Fan qo`shildi'));
      setName('');
    } catch (createError) {
      toast.error(createError?.message || t('Fan qo`shilmadi'));
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm(t('Fanni o`chirmoqchimisiz?'));
    if (!ok) return;
    try {
      await deleteSubject(id).unwrap();
      toast.success(t('Fan o`chirildi'));
    } catch (deleteError) {
      toast.error(deleteError?.message || t('Fan o`chirilmadi'));
    }
  }

  const columns = [
    { key: 'name', header: t('Fan'), render: (subject) => subject.name },
    {
      key: 'actions',
      header: t('Amal'),
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (subject) => (
        <Button
          size="sm"
          variant="danger"
          className="min-w-24"
          disabled={actionLoading}
          onClick={() => handleDelete(subject.id)}
        >
          {t("O'chirish")}
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={t('Fanlar boshqaruvi')}
      actions={(
        <Badge variant="info">
          {t('Jami')}: {subjects.length}
        </Badge>
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t('Yangi fan nomi')}
            </span>
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('Yangi fan nomi')}
            />
          </label>
          <div className="sm:self-end">
            <Button type="submit" variant="success" disabled={actionLoading} className="w-full min-w-28 sm:w-auto">
              {t("Qo'shish")}
            </Button>
          </div>
        </div>
      </form>

      {loading ? (
        <StateView type="loading" />
      ) : error ? (
        <StateView type="error" description={error?.message || t('Fanlar olinmadi')} />
      ) : subjects.length ? (
        <DataTable columns={columns} rows={subjects} stickyHeader stickyFirstColumn maxHeightClassName="max-h-64" />
      ) : (
        <StateView type="empty" description={t('Fanlar mavjud emas')} />
      )}
    </Card>
  );
}
