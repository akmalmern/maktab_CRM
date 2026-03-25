import { useTranslation } from 'react-i18next';
import { Button, Input, Select, Textarea } from '../../../../components/ui';

const fieldLabelClass = 'mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500';

export function FinancePaymentFormSection({
  paymentForm,
  setPaymentForm,
  onSubmit,
  onClose,
  submitDisabled,
  paymentTypeLabel,
  monthKeyToDateInputValue,
  dateInputValueToMonthKey,
  formatMonthKey,
  quickActionDescription,
  quickActionDisabled,
  onQuickAction,
  children,
}) {
  const { t } = useTranslation();

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 md:grid-cols-2"
      >
        <div>
          <span className={fieldLabelClass}>{t("To'lov turi")}</span>
          <Select
            value={paymentForm.turi}
            onChange={(event) =>
              setPaymentForm((prev) => {
                const nextType = event.target.value;
                if (nextType === 'YILLIK') return { ...prev, turi: nextType, oylarSoni: 12 };
                return { ...prev, turi: nextType, oylarSoni: prev.oylarSoni || 1 };
              })
            }
          >
            <option value="OYLIK">{paymentTypeLabel('OYLIK')}</option>
            <option value="YILLIK">{paymentTypeLabel('YILLIK')}</option>
            <option value="IXTIYORIY">{paymentTypeLabel('IXTIYORIY')}</option>
          </Select>
        </div>
        <div>
          <span className={fieldLabelClass}>{t('Boshlanish oyi')}</span>
          <Input
            type="date"
            value={monthKeyToDateInputValue(paymentForm.startMonth)}
            onChange={(event) =>
              setPaymentForm((prev) => ({
                ...prev,
                startMonth: dateInputValueToMonthKey(event.target.value),
              }))
            }
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('Tanlangan oy')}: {formatMonthKey(paymentForm.startMonth)}
          </p>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('Tez amal')}</p>
            <p className="text-xs text-slate-500">{quickActionDescription}</p>
          </div>
          <Button
            type="button"
            variant="indigo"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onQuickAction}
            disabled={quickActionDisabled}
          >
            {t("Barchasini to'lash")}
          </Button>
        </div>
        <div>
          <span className={fieldLabelClass}>{t('Oylar soni')}</span>
          <Input
            type="number"
            min={1}
            value={paymentForm.oylarSoni}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, oylarSoni: event.target.value }))
            }
            placeholder={t('Oylar soni')}
            disabled={paymentForm.turi === 'YILLIK'}
          />
        </div>
        <div>
          <span className={fieldLabelClass}>
            {paymentForm.turi === 'IXTIYORIY'
              ? t("Yuboriladigan summa (majburiy)")
              : t("Yuboriladigan summa (ixtiyoriy)")}
          </span>
          <Input
            type="number"
            min={1}
            value={paymentForm.summa}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, summa: event.target.value }))
            }
            placeholder={
              paymentForm.turi === 'IXTIYORIY'
                ? t("Ixtiyoriy to'lovda summa kiriting")
                : t("Bo'sh qoldirilsa auto hisoblanadi")
            }
            required={paymentForm.turi === 'IXTIYORIY'}
          />
        </div>
        <div className="md:col-span-2">
          <span className={fieldLabelClass}>{t('Izoh')}</span>
          <Textarea
            rows={2}
            value={paymentForm.izoh}
            onChange={(event) =>
              setPaymentForm((prev) => ({ ...prev, izoh: event.target.value }))
            }
            placeholder={t('Izoh (ixtiyoriy)')}
          />
        </div>
        <div className="md:col-span-2 flex flex-col justify-end gap-2 border-t border-slate-200/80 pt-2 sm:flex-row">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
            {t('Yopish')}
          </Button>
          <Button
            type="submit"
            variant="success"
            className="w-full sm:w-auto"
            disabled={submitDisabled}
          >
            {t("To'lovni saqlash")}
          </Button>
        </div>
      </form>
      {children}
    </>
  );
}
