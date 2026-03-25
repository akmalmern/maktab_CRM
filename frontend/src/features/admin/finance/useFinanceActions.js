import useAsyncConfirm from '../../../hooks/useAsyncConfirm';
import useFinanceExportActions from './useFinanceExportActions';
import useFinanceMutationActions from './useFinanceMutationActions';

export default function useFinanceActions({ t, financeQuery }) {
  const { askConfirm, confirmModalProps } = useAsyncConfirm();
  const mutationActions = useFinanceMutationActions({ t, askConfirm });
  const exportActions = useFinanceExportActions({ t, financeQuery });

  return {
    confirmModalProps,
    ...mutationActions,
    ...exportActions,
  };
}
