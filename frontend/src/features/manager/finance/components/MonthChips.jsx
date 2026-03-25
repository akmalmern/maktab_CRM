import { FinanceMonthChips } from '../../../shared/finance/components/FinanceMonthChips';

export function MonthChips({ items = [] }) {
  return <FinanceMonthChips items={items} tone="danger" />;
}
