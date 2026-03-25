import { currentMonthKey } from './managerDebtorsModel';
export {
  createManagerGlobalSummaryState as createGlobalSummaryState,
  createManagerNotesState as createNotesState,
  createManagerPaymentState as createPaymentState,
  createManagerStudentsState as createStudentsState,
} from '../../shared/finance/financeReadModel';

export function createPaymentForm(startMonth = currentMonthKey()) {
  return {
    turi: 'OYLIK',
    startMonth,
    oylarSoni: 1,
    summa: '',
    izoh: '',
  };
}

export function createImtiyozForm(startMonth = currentMonthKey()) {
  return {
    turi: 'FOIZ',
    boshlanishOy: startMonth,
    oylarSoni: 1,
    qiymat: '',
    sabab: '',
    izoh: '',
  };
}
