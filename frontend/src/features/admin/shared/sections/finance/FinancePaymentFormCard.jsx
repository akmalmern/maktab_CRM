import { useTranslation } from 'react-i18next';
import { Button, Input, Select, Textarea } from '../../../../../components/ui';
import { dateInputValueToMonthKey, formatMonthKey, monthKeyToDateInputValue, paymentTypeLabel, resolveLocale } from './financeSectionModel';
import { FieldLabel } from './financeUiShared';
import FinancePaymentPreviewCard from './FinancePaymentPreviewCard';

export default function FinancePaymentFormCard({
  actionLoading,
  detailState,
  selectedStudentId,
  isSelectedDetailReady,
  paymentForm,
  setPaymentForm,
  handleCreatePayment,
  setModalOpen,
  paymentPreview,
  serverPreviewLoading,
  serverPreviewError,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const detailStudent = isSelectedDetailReady ? detailState.student : null;
  const debtMonths = Array.isArray(detailStudent?.qarzOylar)
    ? detailStudent.qarzOylar.filter(Boolean).sort()
    : [];
  const allDebtStartMonth = debtMonths[0] || null;
  const allDebtMonthsCount = debtMonths.length;
  const canFillAllDebts = Boolean(allDebtStartMonth) && allDebtMonthsCount > 0;

  function handleFillAllDebts() {
    if (!canFillAllDebts) return;
    setPaymentForm((p) => ({
      ...p,
      turi: 'OYLIK',
      startMonth: allDebtStartMonth,
      oylarSoni: allDebtMonthsCount,
      summa: '',
    }));
  }

  return (
    <>
      <form
        onSubmit={handleCreatePayment}
        className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 md:grid-cols-2"
      >
        <div>
          <FieldLabel>{t("To'lov turi")}</FieldLabel>
          <Select
            value={paymentForm.turi}
            onChange={(e) =>
              setPaymentForm((p) => {
                const nextType = e.target.value;
                if (nextType === 'YILLIK') {
                  return { ...p, turi: nextType, oylarSoni: 12 };
                }
                return { ...p, turi: nextType, oylarSoni: p.oylarSoni || 1 };
              })
            }
          >
            <option value="OYLIK">{paymentTypeLabel('OYLIK', t)}</option>
            <option value="YILLIK">{paymentTypeLabel('YILLIK', t)}</option>
            <option value="IXTIYORIY">{paymentTypeLabel('IXTIYORIY', t)}</option>
          </Select>
        </div>
        <div>
          <FieldLabel>{t('Boshlanish oyi')}</FieldLabel>
          <Input
            type="date"
            value={monthKeyToDateInputValue(paymentForm.startMonth)}
            onChange={(e) => setPaymentForm((p) => ({ ...p, startMonth: dateInputValueToMonthKey(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-slate-500">{t('Tanlangan oy')}: {formatMonthKey(paymentForm.startMonth, locale)}</p>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{t('Tez amal')}</p>
            <p className="text-xs text-slate-500">
              {canFillAllDebts
                ? t("Qarzdor oylar: {{count}} ta ({{month}}dan boshlab)", {
                    count: allDebtMonthsCount,
                    month: formatMonthKey(allDebtStartMonth, locale),
                  })
                : t("Qarzdor oylar topilmadi")}
            </p>
          </div>
          <Button
            type="button"
            variant="indigo"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleFillAllDebts}
            disabled={actionLoading || detailState.loading || !isSelectedDetailReady || !canFillAllDebts}
          >
            {t("Barchasini to'lash")}
          </Button>
        </div>
        <div>
          <FieldLabel>{t('Oylar soni')}</FieldLabel>
          <Input
            type="number"
            min={1}
            value={paymentForm.oylarSoni}
            onChange={(e) => setPaymentForm((p) => ({ ...p, oylarSoni: e.target.value }))}
            placeholder={t('Oylar soni')}
            disabled={paymentForm.turi === 'YILLIK'}
          />
        </div>
        <div>
          <FieldLabel>
            {paymentForm.turi === 'IXTIYORIY' ? t('Yuboriladigan summa (majburiy)') : t('Yuboriladigan summa (ixtiyoriy)')}
          </FieldLabel>
          <Input
            type="number"
            min={1}
            value={paymentForm.summa}
            onChange={(e) => setPaymentForm((p) => ({ ...p, summa: e.target.value }))}
            placeholder={
              paymentForm.turi === 'IXTIYORIY'
                ? t("Ixtiyoriy to'lovda summa kiriting")
                : t("Bo'sh qoldirilsa auto hisoblanadi")
            }
            required={paymentForm.turi === 'IXTIYORIY'}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>{t('Izoh')}</FieldLabel>
          <Textarea
            rows={2}
            value={paymentForm.izoh}
            onChange={(e) => setPaymentForm((p) => ({ ...p, izoh: e.target.value }))}
            placeholder={t('Izoh (ixtiyoriy)')}
          />
        </div>
        <div className="md:col-span-2 flex flex-col justify-end gap-2 border-t border-slate-200/80 pt-2 sm:flex-row">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setModalOpen(false)}>
            {t('Yopish')}
          </Button>
          <Button
            type="submit"
            variant="success"
            className="w-full sm:w-auto"
            disabled={
              actionLoading ||
              detailState.loading ||
              (Boolean(selectedStudentId) && !isSelectedDetailReady) ||
              !paymentPreview?.valid ||
              !paymentPreview?.previewMonthsCount
            }
          >
            {t("To'lovni saqlash")}
          </Button>
        </div>
      </form>
      <FinancePaymentPreviewCard
        paymentPreview={paymentPreview}
        paymentForm={paymentForm}
        detailState={detailState}
        selectedStudentId={selectedStudentId}
        isSelectedDetailReady={isSelectedDetailReady}
        serverPreviewLoading={serverPreviewLoading}
        serverPreviewError={serverPreviewError}
      />
    </>
  );
}
