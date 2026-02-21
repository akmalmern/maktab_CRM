import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, StateView } from '../../../components/ui';

export default function SubjectManager({
  subjects,
  loading,
  actionLoading,
  onCreateSubject,
  onDeleteSubject,
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onCreateSubject(name);
    if (ok) setName('');
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
          disabled={actionLoading}
          onClick={() => onDeleteSubject(subject.id)}
        >
          {t("O'chirish")}
        </Button>
      ),
    },
  ];

  return (
      <Card title={t('Fanlar boshqaruvi')} actions={<span className="text-sm text-slate-500">{t('Jami')}: {subjects.length}</span>}>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Yangi fan nomi')}
        />
        <Button type="submit" variant="success" disabled={actionLoading}>
          {t("Qo'shish")}
        </Button>
      </form>

      {loading ? (
        <StateView type="loading" />
      ) : subjects.length ? (
        <DataTable columns={columns} rows={subjects} stickyHeader maxHeightClassName="max-h-56" />
      ) : (
        <StateView type="empty" description={t('Fanlar mavjud emas')} />
      )}
      </Card>
  );
}
