import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Input, Select, StateView, Textarea } from '../../../../components/ui';

const fieldLabelClass = 'mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500';

export function FinanceImtiyozSection({
  actionLoading,
  imtiyozForm,
  setImtiyozForm,
  onSubmit,
  detailImtiyozlar = [],
  onDeactivate,
  monthKeyToDateInputValue,
  dateInputValueToMonthKey,
  formatMonthKey,
  imtiyozTypeLabel,
  sumFormat,
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Card title={t('Imtiyoz berish')}>
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 lg:grid-cols-3"
        >
          <div>
            <span className={fieldLabelClass}>{t('Imtiyoz turi')}</span>
            <Select
              value={imtiyozForm.turi}
              onChange={(event) =>
                setImtiyozForm((prev) => ({
                  ...prev,
                  turi: event.target.value,
                  qiymat: event.target.value === 'TOLIQ_OZOD' ? '' : prev.qiymat,
                }))
              }
            >
              <option value="FOIZ">{imtiyozTypeLabel('FOIZ')}</option>
              <option value="SUMMA">{imtiyozTypeLabel('SUMMA')}</option>
              <option value="TOLIQ_OZOD">{imtiyozTypeLabel('TOLIQ_OZOD')}</option>
            </Select>
          </div>
          <div>
            <span className={fieldLabelClass}>{t('Boshlanish oyi')}</span>
            <Input
              type="date"
              value={monthKeyToDateInputValue(imtiyozForm.boshlanishOy)}
              onChange={(event) =>
                setImtiyozForm((prev) => ({
                  ...prev,
                  boshlanishOy: dateInputValueToMonthKey(event.target.value),
                }))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('Tanlangan oy')}: {formatMonthKey(imtiyozForm.boshlanishOy)}
            </p>
          </div>
          <div>
            <span className={fieldLabelClass}>{t('Necha oyga')}</span>
            <Input
              type="number"
              min={1}
              value={imtiyozForm.oylarSoni}
              onChange={(event) =>
                setImtiyozForm((prev) => ({ ...prev, oylarSoni: event.target.value }))
              }
              placeholder={t('Oylar soni')}
            />
          </div>
          {imtiyozForm.turi !== 'TOLIQ_OZOD' && (
            <div>
              <span className={fieldLabelClass}>
                {imtiyozForm.turi === 'FOIZ' ? t('Foiz qiymati') : t('Chegirma summasi')}
              </span>
              <Input
                type="number"
                min={1}
                value={imtiyozForm.qiymat}
                onChange={(event) =>
                  setImtiyozForm((prev) => ({ ...prev, qiymat: event.target.value }))
                }
                placeholder={
                  imtiyozForm.turi === 'FOIZ' ? t('Foiz (1-99)') : t("Summa (so'm)")
                }
                required
              />
            </div>
          )}
          <div className={imtiyozForm.turi === 'TOLIQ_OZOD' ? 'lg:col-span-2' : ''}>
            <span className={fieldLabelClass}>{t('Sabab')}</span>
            <Input
              type="text"
              value={imtiyozForm.sabab}
              onChange={(event) =>
                setImtiyozForm((prev) => ({ ...prev, sabab: event.target.value }))
              }
              placeholder={t('Masalan: yutuq, ijtimoiy holat')}
              required
            />
          </div>
          <div className="lg:col-span-3">
            <span className={fieldLabelClass}>{t('Izoh (ixtiyoriy)')}</span>
            <Textarea
              rows={2}
              value={imtiyozForm.izoh}
              onChange={(event) =>
                setImtiyozForm((prev) => ({ ...prev, izoh: event.target.value }))
              }
              placeholder={t('Izoh (ixtiyoriy)')}
            />
          </div>
          <div className="lg:col-span-3 flex justify-end border-t border-slate-200/80 pt-2">
            <Button type="submit" variant="indigo" disabled={actionLoading}>
              {t('Imtiyozni saqlash')}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t('Berilgan imtiyozlar')}>
        {!detailImtiyozlar.length ? (
          <StateView type="empty" description={t("Imtiyozlar yo'q")} />
        ) : (
          <div className="space-y-2">
            {detailImtiyozlar.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {imtiyozTypeLabel(item.turi)}
                    {item.turi === 'FOIZ' && ` (${item.qiymat}%)`}
                    {item.turi === 'SUMMA' && ` (${sumFormat(item.qiymat)} ${t("so'm")})`}
                  </p>
                  <p className="text-xs text-slate-600">
                    {item.davrLabel || '-'} {item.sabab ? `| ${item.sabab}` : ''}
                  </p>
                </div>
                {item.isActive ? (
                  <Button
                    size="sm"
                    variant="danger"
                    className="min-w-24"
                    onClick={() => onDeactivate(item.id)}
                    disabled={actionLoading}
                  >
                    {t('Bekor qilish')}
                  </Button>
                ) : (
                  <Badge variant="secondary">{t('Bekor qilingan')}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
