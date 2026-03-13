import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Select, Textarea } from '../../../../../components/ui';
import { dateInputValueToMonthKey, formatMonthKey, imtiyozTypeLabel, monthKeyToDateInputValue, resolveLocale, sumFormat } from './financeSectionModel';
import { FieldLabel } from './financeUiShared';

export default function FinanceImtiyozFormCard({
  actionLoading,
  imtiyozForm,
  setImtiyozForm,
  handleCreateImtiyoz,
  detailImtiyozlar,
  handleDeactivateImtiyoz,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  return (
    <Card title={t('Imtiyoz berish')}>
      <form
        onSubmit={handleCreateImtiyoz}
        className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 lg:grid-cols-3"
      >
        <div>
          <FieldLabel>{t('Imtiyoz turi')}</FieldLabel>
          <Select
            value={imtiyozForm.turi}
            onChange={(e) =>
              setImtiyozForm((p) => ({
                ...p,
                turi: e.target.value,
                qiymat: e.target.value === 'TOLIQ_OZOD' ? '' : p.qiymat,
              }))
            }
          >
            <option value="FOIZ">{imtiyozTypeLabel('FOIZ', t)}</option>
            <option value="SUMMA">{imtiyozTypeLabel('SUMMA', t)}</option>
            <option value="TOLIQ_OZOD">{imtiyozTypeLabel('TOLIQ_OZOD', t)}</option>
          </Select>
        </div>
        <div>
          <FieldLabel>{t('Boshlanish oyi')}</FieldLabel>
          <Input
            type="date"
            value={monthKeyToDateInputValue(imtiyozForm.boshlanishOy)}
            onChange={(e) =>
              setImtiyozForm((p) => ({ ...p, boshlanishOy: dateInputValueToMonthKey(e.target.value) }))
            }
          />
          <p className="mt-1 text-xs text-slate-500">{t('Tanlangan oy')}: {formatMonthKey(imtiyozForm.boshlanishOy, locale)}</p>
        </div>
        <div>
          <FieldLabel>{t('Necha oyga')}</FieldLabel>
          <Input
            type="number"
            min={1}
            value={imtiyozForm.oylarSoni}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, oylarSoni: e.target.value }))}
            placeholder={t('Oylar soni')}
          />
        </div>
        {imtiyozForm.turi !== 'TOLIQ_OZOD' && (
          <div>
            <FieldLabel>{imtiyozForm.turi === 'FOIZ' ? t('Foiz qiymati') : t('Chegirma summasi')}</FieldLabel>
            <Input
              type="number"
              min={1}
              value={imtiyozForm.qiymat}
              onChange={(e) => setImtiyozForm((p) => ({ ...p, qiymat: e.target.value }))}
              placeholder={imtiyozForm.turi === 'FOIZ' ? t('Foiz (1-99)') : t("Summa (so'm)")}
              required
            />
          </div>
        )}
        <div className={imtiyozForm.turi === 'TOLIQ_OZOD' ? 'lg:col-span-2' : ''}>
          <FieldLabel>{t('Sabab')}</FieldLabel>
          <Input
            type="text"
            value={imtiyozForm.sabab}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, sabab: e.target.value }))}
            placeholder={t('Masalan: yutuq, ijtimoiy holat')}
            required
          />
        </div>
        <div className="lg:col-span-3">
          <FieldLabel>{t('Izoh (ixtiyoriy)')}</FieldLabel>
          <Textarea
            rows={2}
            value={imtiyozForm.izoh}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, izoh: e.target.value }))}
            placeholder={t('Izoh (ixtiyoriy)')}
          />
        </div>
        <div className="lg:col-span-3 flex justify-end border-t border-slate-200/80 pt-2">
          <Button type="submit" variant="indigo" disabled={actionLoading}>
            {t('Imtiyozni saqlash')}
          </Button>
        </div>
      </form>

      <div className="mt-3 space-y-2">
        <p className="text-sm font-semibold text-slate-700">{t('Berilgan imtiyozlar')}</p>
        {!detailImtiyozlar.length ? (
          <p className="text-sm text-slate-500">{t("Imtiyozlar yo'q")}</p>
        ) : (
          <div className="space-y-2">
            {detailImtiyozlar.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {imtiyozTypeLabel(item.turi, t)}
                    {item.turi === 'FOIZ' && ` (${item.qiymat}%)`}
                    {item.turi === 'SUMMA' && ` (${sumFormat(item.qiymat, locale)} ${t("so'm")})`}
                  </p>
                  <p className="text-xs text-slate-600">
                    {item.davrLabel} | {item.sabab}
                  </p>
                </div>
                {item.isActive ? (
                  <Button
                    size="sm"
                    variant="danger"
                    className="min-w-24"
                    onClick={() => handleDeactivateImtiyoz(item.id)}
                    disabled={actionLoading}
                  >
                    {t('Bekor qilish')}
                  </Button>
                ) : (
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {t('Bekor qilingan')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
