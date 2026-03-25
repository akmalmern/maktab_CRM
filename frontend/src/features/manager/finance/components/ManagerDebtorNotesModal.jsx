import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Modal, StateView, Textarea } from '../../../../components/ui';
import { formatDate, formatDateTime, formatMoney, resolveLocale } from '../managerDebtorsModel';

const fieldLabelClass = 'text-xs font-medium uppercase tracking-wide text-slate-500';

export function ManagerDebtorNotesModal({
  open,
  onClose,
  selectedStudent,
  noteForm,
  setNoteForm,
  savingNote,
  notesState,
  onSaveNote,
  onLoadNotes,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  return (
    <Modal open={open} onClose={onClose} title={t('Ota-ona bilan aloqa izohlari')} maxWidth="max-w-4xl">
      {!selectedStudent ? (
        <StateView type="empty" description={t("O'quvchi tanlanmagan.")} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm shadow-sm ring-1 ring-slate-200/50">
            <p className="font-semibold text-slate-900">{selectedStudent.fullName}</p>
            <p className="mt-1 text-slate-600">{t('Sinf')}: {selectedStudent.classroom}</p>
            <p className="text-slate-600">
              {t('Ota-ona telefoni')}:{' '}
              {selectedStudent.parentPhone && selectedStudent.parentPhone !== '-' ? (
                <a
                  href={`tel:${selectedStudent.parentPhone}`}
                  className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
                >
                  {selectedStudent.parentPhone}
                </a>
              ) : (
                '-'
              )}
            </p>
            <p className="mt-1 text-rose-700">
              {t('Qarz')}: <b>{selectedStudent.qarzOylarSoni}</b> {t('oy')} /{' '}
              <b>{formatMoney(selectedStudent.jamiQarzSumma, locale, t)}</b>
            </p>
          </div>

          <form
            onSubmit={onSaveNote}
            className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50"
          >
            <p className="text-sm font-semibold text-slate-900">{t("Yangi izoh qo'shish")}</p>
            <Textarea
              rows={3}
              value={noteForm.izoh}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, izoh: event.target.value }))}
              placeholder={t("Masalan: Ota-onasi bilan gaplashildi, keyingi haftada to'lov qilishini aytdi.")}
              required
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className={fieldLabelClass}>{t("Va'da qilingan sana")}</p>
                <Input
                  type="date"
                  value={noteForm.promisedPayDate}
                  onChange={(event) =>
                    setNoteForm((prev) => ({ ...prev, promisedPayDate: event.target.value }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="success" className="w-full" disabled={savingNote}>
                  {savingNote ? t('Saqlanmoqda...') : t("Izohni saqlash")}
                </Button>
              </div>
            </div>
          </form>

          <Card title={t('Izohlar tarixi ({{count}})', { count: notesState.total })}>
            {notesState.loading && <StateView type="loading" />}
            {!notesState.loading && notesState.error && (
              <StateView type="error" description={notesState.error} />
            )}
            {!notesState.loading && !notesState.error && !notesState.items.length && (
              <StateView type="empty" description={t("Hali izoh kiritilmagan.")} />
            )}
            {!notesState.loading && !notesState.error && notesState.items.length > 0 && (
              <div className="space-y-2">
                {notesState.items.map((note) => (
                  <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <p className="text-slate-800">{note.izoh}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{t('Yozilgan vaqt')}: {formatDateTime(note.createdAt, locale)}</span>
                      <span>{t('Manager')}: {note.manager?.fullName || note.manager?.username || '-'}</span>
                      <span>{t("Va'da qilingan sana")}: {formatDate(note.promisedPayDate, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onLoadNotes(selectedStudent.id, Math.max(1, notesState.page - 1))}
                disabled={notesState.page <= 1 || notesState.loading}
              >
                {t('Oldingi')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  onLoadNotes(selectedStudent.id, Math.min(notesState.pages || 1, notesState.page + 1))
                }
                disabled={notesState.page >= (notesState.pages || 1) || notesState.loading}
              >
                {t('Keyingi')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}
