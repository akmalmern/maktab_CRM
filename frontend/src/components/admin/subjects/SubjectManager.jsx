import { useState } from 'react';
import AutoTranslate from '../../AutoTranslate';
import { Button, Card, DataTable, Input, StateView } from '../../../components/ui';

export default function SubjectManager({
  subjects,
  loading,
  actionLoading,
  onCreateSubject,
  onDeleteSubject,
}) {
  const [name, setName] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
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
    <AutoTranslate>
      <Card title="Fanlar boshqaruvi" actions={<span className="text-sm text-slate-500">Jami: {subjects.length}</span>}>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
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
    </AutoTranslate>
  );
}
