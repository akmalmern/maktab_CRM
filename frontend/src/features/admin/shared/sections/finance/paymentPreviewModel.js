import {
  buildAdminPaymentPreview,
  mergePaymentPreviewWithServer,
} from '../../../../shared/finance/paymentPreviewModel';

export function buildFinancePaymentPreview({ detailStudent, paymentForm, oylikTarif }) {
  return buildAdminPaymentPreview({ detailStudent, paymentForm, oylikTarif });
}

export function mergeServerPaymentPreview(localPreview, serverPreview) {
  return mergePaymentPreviewWithServer(localPreview, serverPreview, {
    requireLocalSummaMatches: true,
    invalidateWhenAlreadyPaid: true,
  });
}

export function buildFinancePreviewFromLocalAndServer({
  detailStudent,
  paymentForm,
  oylikTarif,
  serverPreview,
}) {
  const localPreview = buildFinancePaymentPreview({
    detailStudent,
    paymentForm,
    oylikTarif,
  });
  return mergeServerPaymentPreview(localPreview, serverPreview);
}
