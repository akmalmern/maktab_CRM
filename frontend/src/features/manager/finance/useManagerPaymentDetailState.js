import { useMemo } from 'react';
import { useGetManagerPaymentStudentDetailQuery } from '../../../services/api/managerApi';
import { normalizeManagerPaymentState } from '../../shared/finance/financeReadModel';

export default function useManagerPaymentDetailState({
  t,
  paymentModalOpen,
  paymentStudentId,
}) {
  const paymentDetailQuery = useGetManagerPaymentStudentDetailQuery(paymentStudentId, {
    skip: !paymentModalOpen || !paymentStudentId,
  });

  const paymentState = useMemo(
    () =>
      normalizeManagerPaymentState({
        data: paymentDetailQuery.data,
        loading:
          paymentDetailQuery.isLoading ||
          paymentDetailQuery.isFetching ||
          (paymentModalOpen && Boolean(paymentStudentId) && paymentDetailQuery.isUninitialized),
        error: paymentDetailQuery.error,
        errorMessage: paymentDetailQuery.error ? t("To'lov ma'lumotlari olinmadi") : '',
      }),
    [
      paymentDetailQuery.data,
      paymentDetailQuery.error,
      paymentDetailQuery.isFetching,
      paymentDetailQuery.isLoading,
      paymentDetailQuery.isUninitialized,
      paymentModalOpen,
      paymentStudentId,
      t,
    ],
  );

  return {
    paymentState,
  };
}
