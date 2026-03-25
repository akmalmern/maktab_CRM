import { useTranslation } from 'react-i18next';
import useFinanceActions from './useFinanceActions';
import useFinanceData from './useFinanceData';
import useFinanceQueryController from './useFinanceQueryController';

export default function useAdminFinancePage() {
  const { t } = useTranslation();
  const queryState = useFinanceQueryController();
  const dataState = useFinanceData({
    financeStudentsParams: queryState.financeStudentsParams,
    financeQueryLimit: queryState.financeQuery.limit,
  });
  const actionsState = useFinanceActions({
    t,
    financeQuery: queryState.financeQuery,
  });

  return {
    ...dataState,
    ...actionsState,
    financeQuery: queryState.financeQuery,
    handleFinanceQueryChange: queryState.handleFinanceQueryChange,
  };
}
