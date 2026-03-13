import { useTranslation } from 'react-i18next';
import { Card, StateView } from '../../../../../components/ui';
import { formatMonthKey, paymentTypeLabel, resolveLocale, sumFormat } from './financeSectionModel';
import { MonthChips } from './financeUiShared';

export default function FinancePaymentPreviewCard({
  paymentPreview,
  paymentForm,
  detailState,
  selectedStudentId,
  isSelectedDetailReady,
  serverPreviewLoading,
  serverPreviewError,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const monthsToClose = paymentPreview?.monthsToClose || [];
  const actuallyClosing = paymentPreview?.actuallyClosing || [];
  const prepaymentMonths = paymentPreview?.prepaymentMonths || [];
  const selectedDebtAmounts = paymentPreview?.selectedDebtAmounts || [];

  return (
    <Card title={t("To'lov preview")}>
      {!paymentPreview ? (
        <StateView
          type={detailState.loading || (selectedStudentId && !isSelectedDetailReady) ? 'loading' : 'empty'}
          description={
            detailState.loading || (selectedStudentId && !isSelectedDetailReady)
              ? t("Student to'lov ma'lumoti yuklanmoqda")
              : t('Preview mavjud emas')
          }
        />
      ) : (
        <div className="space-y-2 text-sm">
          {!paymentPreview.hasAnyPayableMonth && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              {t("Tanlangan davr bo'yicha to'lov hisoblab bo'lmadi (tarif yoki qarz ma'lumoti yetarli emas).")}
            </p>
          )}
          {paymentPreview.hasAnyPrepaymentMonth && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
              {t("Tanlangan davrda qarz bo'lmagan oylar ham bor. Ular oldindan to'lov sifatida hisoblanadi")}
              {paymentPreview.currentOylikTarif > 0
                ? ` (${t('oylik tarif')}: ${sumFormat(paymentPreview.currentOylikTarif, locale)} ${t("so'm")})`
                : ''}
              .
            </p>
          )}
          {serverPreviewLoading && (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
              {t('Server preview hisoblanmoqda...')}
            </p>
          )}
          {paymentPreview.serverPreview?.alreadyPaidMonths?.length > 0 && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              {t("Tanlangan oylarning bir qismi oldin qoplangan")}:{' '}
              {paymentPreview.serverPreview.alreadyPaidMonthsFormatted?.join(', ')}
            </p>
          )}
          {!serverPreviewLoading && serverPreviewError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              {t('Server preview xabari')}: {serverPreviewError}
            </p>
          )}
          {!paymentPreview.summaMatches && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              {paymentPreview.missingManualSumma
                ? t("Ixtiyoriy to'lovda summa majburiy.")
                : paymentPreview.exceedsExpectedSumma
                  ? t("Yuboriladigan summa tanlangan qarz oylaridan katta bo'lmasligi kerak.")
                  : t("Yuboriladigan summa noto'g'ri kiritilgan.")}
            </p>
          )}
          {paymentPreview.isPartialPayment && (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
              {t("Qisman to'lov: tanlangan qarz oylarining bir qismi yopiladi.")}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 md:grid-cols-2">
            <p className="text-slate-700">{t("To'lov turi")}: <b>{paymentTypeLabel(paymentForm.turi, t)}</b></p>
            <p className="text-slate-700">{t('Yopiladigan oylar soni')}: <b>{paymentPreview.previewMonthsCount}</b></p>
            <p className="text-slate-700 md:col-span-2">
              {t('Davr')}:{' '}
              <b>
                {paymentPreview.firstMonth
                  ? `${formatMonthKey(paymentPreview.firstMonth, locale)} - ${formatMonthKey(paymentPreview.lastMonth, locale)}`
                  : '-'}
              </b>
            </p>
            <p className="text-slate-700">{t('Kutilgan summa')}: <b>{sumFormat(paymentPreview.expectedSumma, locale)} {t("so'm")}</b></p>
            <p className="text-slate-700">{t('Yuboriladigan summa')}: <b>{sumFormat(paymentPreview.finalSumma, locale)} {t("so'm")}</b></p>
            <p className="text-slate-700">
              {t('Qarzdan yopiladigan summa')}: <b>{sumFormat(paymentPreview.debtExpectedSumma, locale)} {t("so'm")}</b>
            </p>
            <p className="text-slate-700">
              {t("Oldindan to'lov (taxminiy)")}: <b>{sumFormat(paymentPreview.prepaymentExpectedSumma, locale)} {t("so'm")}</b>
            </p>
          </div>
          <div>
            <p className="mb-1 text-slate-600">{t('Yopilishi rejalangan oylar')}:</p>
            <MonthChips months={monthsToClose.map((month) => formatMonthKey(month, locale))} maxVisible={6} />
          </div>
          <div>
            <p className="mb-1 text-slate-600">{t('Qarzdan yopiladigan oylar')}:</p>
            <MonthChips months={actuallyClosing.map((month) => formatMonthKey(month, locale))} maxVisible={6} />
          </div>
          <div>
            <p className="mb-1 text-slate-600">{t("Oldindan to'lanadigan oylar")}:</p>
            <MonthChips months={prepaymentMonths.map((month) => formatMonthKey(month, locale))} maxVisible={6} />
          </div>
          {!!selectedDebtAmounts.length && (
            <div>
              <p className="mb-1 text-slate-600">{t('Oylar kesimida summa')}:</p>
              <div className="flex flex-wrap gap-1">
                {selectedDebtAmounts.map((item) => (
                  <span
                    key={item.key}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    {formatMonthKey(item.key, locale)}: {sumFormat(item.amount, locale)} {t("so'm")}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-slate-700">
            {t('Qoladigan qarz')}: <b>{paymentPreview.remainDebtCount}</b> {t('oy')} /{' '}
            <b>{sumFormat(paymentPreview.remainDebtAmount, locale)} {t("so'm")}</b>
          </p>
        </div>
      )}
    </Card>
  );
}
