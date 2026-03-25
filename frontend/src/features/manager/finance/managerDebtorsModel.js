export const NOTES_PAGE_LIMIT = 10;
export const MANAGER_DEBTORS_LIMIT = 500;

import {
  buildMonthRange,
  createClientRequestKey,
  currentMonthKey,
  dateInputValueToMonthKey,
  formatDate,
  formatDateTime,
  formatMonthKey,
  formatNumberByLocale,
  fromMonthNumber,
  monthKeyToDateInputValue,
  resolveLocale,
  toMonthNumber,
} from '../../shared/finance/financeSharedModel';
import {
  imtiyozTypeLabel,
  paymentTypeLabel,
} from '../../shared/finance/financeLabelModel';
import {
  buildManagerPaymentPreview as buildSharedManagerPaymentPreview,
  mergePaymentPreviewWithServer,
} from '../../shared/finance/paymentPreviewModel';

export {
  buildMonthRange,
  createClientRequestKey,
  currentMonthKey,
  dateInputValueToMonthKey,
  formatDate,
  formatDateTime,
  formatMonthKey,
  fromMonthNumber,
  imtiyozTypeLabel,
  monthKeyToDateInputValue,
  paymentTypeLabel,
  resolveLocale,
  toMonthNumber,
};

export function sumFormat(value, locale) {
  return formatNumberByLocale(value, locale, { replaceCommas: true });
}

export function formatMoney(value, locale, t) {
  return `${sumFormat(value, locale)} ${t("so'm")}`;
}

export function buildManagerPaymentPreview(detailStudent, paymentForm) {
  return buildSharedManagerPaymentPreview({ detailStudent, paymentForm });
}

export function mergeManagerServerPaymentPreview(localPreview, serverPreview) {
  return mergePaymentPreviewWithServer(localPreview, serverPreview, {
    requireLocalSummaMatches: false,
    invalidateWhenAlreadyPaid: false,
    includeTopLevelAlreadyPaidFormatted: true,
  });
}

export function managerSelectedClassRecordsLabel(language) {
  if (language === 'ru') {
    return '\u0417\u0430\u043f\u0438\u0441\u0438 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u043a\u043b\u0430\u0441\u0441\u0430';
  }
  if (language === 'en') return 'Selected class records';
  return "Tanlangan sinf yozuvlari";
}
