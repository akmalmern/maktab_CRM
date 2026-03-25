import { Button, Card, DataTable, Input, Select } from '../../../../components/ui';
import {
  formatBytes,
  formatDate,
} from './adminPersonDetailModel';

export default function AdminPersonDocumentsTab({
  t,
  i18nLanguage,
  person,
  docKinds,
  docForm,
  setDocForm,
  actionLoading,
  onUploadDocument,
  onDownload,
  onDeleteDocument,
  editDocId,
  setEditDocId,
  editForm,
  setEditForm,
  onSaveDocument,
}) {
  return (
    <Card title={t('Hujjatlar', { defaultValue: 'Hujjatlar' })}>
      <form
        onSubmit={onUploadDocument}
        className="mt-1 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-4"
      >
        <Select value={docForm.kind} onChange={(event) => setDocForm((prev) => ({ ...prev, kind: event.target.value }))}>
          {docKinds.map((kind) => (
            <option key={kind} value={kind}>
              {t(kind, { defaultValue: kind })}
            </option>
          ))}
        </Select>
        <Input
          type="text"
          value={docForm.title}
          onChange={(event) => setDocForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder={t('Sarlavha', { defaultValue: 'Sarlavha' })}
        />
        <Input
          type="file"
          onChange={(event) => setDocForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
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
          stickyFirstColumn
          columns={[
            {
              key: 'title',
              header: t('Nomi', { defaultValue: 'Nomi' }),
              render: (doc) => doc.title || doc.fileName,
            },
            {
              key: 'kind',
              header: t('Turi', { defaultValue: 'Turi' }),
              render: (doc) => doc.kind,
            },
            {
              key: 'sizeBytes',
              header: t('Hajmi', { defaultValue: 'Hajmi' }),
              render: (doc) => formatBytes(doc.sizeBytes),
            },
            {
              key: 'createdAt',
              header: t('Sana', { defaultValue: 'Sana' }),
              render: (doc) => formatDate(doc.createdAt, i18nLanguage),
            },
            {
              key: 'actions',
              header: t('Amallar', { defaultValue: 'Amallar' }),
              render: (doc) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onDownload(doc)}>
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
                  <Button size="sm" variant="danger" onClick={() => onDeleteDocument(doc.id)}>
                    {t("O'chirish", { defaultValue: "O'chirish" })}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {editDocId ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-semibold text-amber-800">
            {t('Hujjatni yangilash', { defaultValue: 'Hujjatni yangilash' })}
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Select value={editForm.kind} onChange={(event) => setEditForm((prev) => ({ ...prev, kind: event.target.value }))}>
              {docKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(kind, { defaultValue: kind })}
                </option>
              ))}
            </Select>
            <Input
              type="text"
              value={editForm.title}
              onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={t('Yangi sarlavha', { defaultValue: 'Yangi sarlavha' })}
            />
            <div className="flex gap-2">
              <Button onClick={onSaveDocument} disabled={actionLoading} variant="success">
                {t('Saqlash', { defaultValue: 'Saqlash' })}
              </Button>
              <Button onClick={() => setEditDocId(null)} variant="secondary">
                {t('Bekor qilish', { defaultValue: 'Bekor qilish' })}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
