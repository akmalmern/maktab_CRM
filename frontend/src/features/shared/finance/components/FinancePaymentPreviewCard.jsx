import { useTranslation } from 'react-i18next';
import { Card, StateView } from '../../../../components/ui';
import { FinanceMonthChips } from './FinanceMonthChips';

export function FinancePaymentPreviewCard({
  paymentPreview,
  paymentForm,
  paymentTypeLabel,
  formatMonthKey,
  sumFormat,
  stateType = 'empty',
  stateDescription,
  serverPreviewLoading = false,
  serverPreviewError = '',
  mode = 'admin',
  monthChipTone = 'neutral',
}) {
  const { t } = useTranslation();
  const monthsToClose = paymentPreview?.monthsToClose || [];
  const actuallyClosing =
    paymentPreview?.actuallyClosing || paymentPreview?.debtClosingMonths || [];
  const prepaymentMonths = paymentPreview?.prepaymentMonths || [];
  const selectedDebtAmounts = paymentPreview?.selectedDebtAmounts || [];
  const alreadyPaidMonthsFormatted =
    paymentPreview?.alreadyPaidMonthsFormatted ||
    paymentPreview?.serverPreview?.alreadyPaidMonthsFormatted ||
    [];
  const showAdminDetails = mode === 'admin';

  return (
    <Card title={t("To'lov preview")}>
      {!paymentPreview ? (
        <StateView type={stateType} description={stateDescription || t('Preview mavjud emas')} />
      ) : (
        <div className="space-y-2 text-sm">
          {showAdminDetails && !paymentPreview.hasAnyPayableMonth && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              {t("Tanlangan davr bo'yicha to'lov hisoblab bo'lmadi (tarif yoki qarz ma'lumoti yetarli emas).")}
            </p>
          )}
          {showAdminDetails && paymentPreview.hasAnyPrepaymentMonth && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
              {t("Tanlangan davrda qarz bo'lmagan oylar ham bor. Ular oldindan to'lov sifatida hisoblanadi")}
              {paymentPreview.currentOylikTarif > 0
                ? ` (${t('oylik tarif')}: ${sumFormat(paymentPreview.currentOylikTarif)} ${t("so'm")})`
                : ''}
              .
            </p>
          )}
          {serverPreviewLoading && (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
              {t('Server preview hisoblanmoqda...')}
            </p>
          )}
          {!!alreadyPaidMonthsFormatted.length && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              {t("Tanlangan oylarning bir qismi oldin qoplangan")}: {alreadyPaidMonthsFormatted.join(', ')}
            </p>
          )}
          {!serverPreviewLoading && serverPreviewError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              {t('Server preview xabari')}: {serverPreviewError}
            </p>
          )}
          {showAdminDetails && !paymentPreview.summaMatches && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              {paymentPreview.missingManualSumma
                ? t("Ixtiyoriy to'lovda summa majburiy.")
                : paymentPreview.exceedsExpectedSumma
                  ? t("Yuboriladigan summa tanlangan qarz oylaridan katta bo'lmasligi kerak.")
                  : t("Yuboriladigan summa noto'g'ri kiritilgan.")}
            </p>
          )}
          {showAdminDetails && paymentPreview.isPartialPayment && (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
              {t("Qisman to'lov: tanlangan qarz oylarining bir qismi yopiladi.")}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 md:grid-cols-2">
            <p className="text-slate-700">
              {t("To'lov turi")}: <b>{paymentTypeLabel(paymentForm.turi)}</b>
            </p>
            <p className="text-slate-700">
              {t('Yopiladigan oylar soni')}: <b>{paymentPreview.previewMonthsCount || 0}</b>
            </p>
            {showAdminDetails && (
              <p className="text-slate-700 md:col-span-2">
                {t('Davr')}: <b>{paymentPreview.firstMonth ? `${formatMonthKey(paymentPreview.firstMonth)} - ${formatMonthKey(paymentPreview.lastMonth)}` : '-'}</b>
              </p>
            )}
            <p className="text-slate-700">
              {t('Kutilgan summa')}: <b>{sumFormat(paymentPreview.expectedSumma || 0)} {t("so'm")}</b>
            </p>
            <p className="text-slate-700">
              {t('Yuboriladigan summa')}: <b>{sumFormat(paymentPreview.finalSumma || 0)} {t("so'm")}</b>
            </p>
            {showAdminDetails && (
              <p className="text-slate-700">
                {t('Qarzdan yopiladigan summa')}: <b>{sumFormat(paymentPreview.debtExpectedSumma || 0)} {t("so'm")}</b>
              </p>
            )}
            {showAdminDetails && (
              <p className="text-slate-700">
                {t("Oldindan to'lov (taxminiy)")}: <b>{sumFormat(paymentPreview.prepaymentExpectedSumma || 0)} {t("so'm")}</b>
              </p>
            )}
          </div>
          <div>
            <p className="mb-1 text-slate-600">{t('Yopilishi rejalangan oylar')}:</p>
            <FinanceMonthChips
              items={monthsToClose.map((month) => formatMonthKey(month))}
              maxVisible={6}
              tone={monthChipTone}
            />
          </div>
          <div>
            <p className="mb-1 text-slate-600">{t('Qarzdan yopiladigan oylar')}:</p>
            <FinanceMonthChips
              items={actuallyClosing.map((month) => formatMonthKey(month))}
              maxVisible={6}
              tone={monthChipTone}
            />
          </div>
          {showAdminDetails && (
            <div>
              <p className="mb-1 text-slate-600">{t("Oldindan to'lanadigan oylar")}:</p>
              <FinanceMonthChips
                items={prepaymentMonths.map((month) => formatMonthKey(month))}
                maxVisible={6}
                tone={monthChipTone}
              />
            </div>
          )}
          {showAdminDetails && !!selectedDebtAmounts.length && (
            <div>
              <p className="mb-1 text-slate-600">{t('Oylar kesimida summa')}:</p>
              <div className="flex flex-wrap gap-1">
                {selectedDebtAmounts.map((item) => (
                  <span
                    key={item.key}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    {formatMonthKey(item.key)}: {sumFormat(item.amount)} {t("so'm")}
                  </span>
                ))}
              </div>
            </div>
          )}
          {showAdminDetails && (
            <p className="text-slate-700">
              {t('Qoladigan qarz')}: <b>{paymentPreview.remainDebtCount}</b> {t('oy')} / <b>{sumFormat(paymentPreview.remainDebtAmount)} {t("so'm")}</b>
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
