import { Button } from '../../../../../components/ui';

export default function FinancePaymentsPagination({
  t,
  query,
  studentsState,
  onChangeQuery,
}) {
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChangeQuery({ page: Math.max(1, query.page - 1) })}
        disabled={query.page <= 1}
      >
        {t('Oldingi')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onChangeQuery({ page: Math.min(studentsState.pages || 1, query.page + 1) })}
        disabled={query.page >= (studentsState.pages || 1)}
      >
        {t('Keyingi')}
      </Button>
    </div>
  );
}
