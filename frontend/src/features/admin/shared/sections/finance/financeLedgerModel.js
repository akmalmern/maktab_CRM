import { buildFinanceLedgerItems as buildSharedFinanceLedgerItems } from '../../../../shared/finance/financeLedgerModel';
import {
  formatMonthKey,
  imtiyozTypeLabel,
  paymentTypeLabel,
  sumFormat,
} from './financeSectionModel';

export function buildFinanceLedgerItems({ transactions = [], imtiyozlar = [], t, locale }) {
  return buildSharedFinanceLedgerItems({
    transactions,
    imtiyozlar,
    t,
    paymentTypeLabel: (type) => paymentTypeLabel(type, t),
    imtiyozTypeLabel: (type) => imtiyozTypeLabel(type, t),
    sumFormat: (value) => sumFormat(value, locale),
    formatMonthKey: (value) => formatMonthKey(value, locale),
  });
}
