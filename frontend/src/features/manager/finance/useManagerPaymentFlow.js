import { useState } from 'react';
import { createClientRequestKey } from './managerDebtorsModel';
import {
  buildManagerPaymentModalState,
  firstManagerDebtMonth,
} from './managerPaymentPayloads';
import { createImtiyozForm, createPaymentForm } from './managerDebtorsState';
import useManagerPaymentDetailState from './useManagerPaymentDetailState';
import useManagerPaymentMutations from './useManagerPaymentMutations';
import useManagerPaymentPreviewState from './useManagerPaymentPreviewState';

export default function useManagerPaymentFlow({ t }) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState('payment');
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentForm, setPaymentForm] = useState(createPaymentForm);
  const [imtiyozForm, setImtiyozForm] = useState(createImtiyozForm);
  const [paymentRequestKey, setPaymentRequestKey] = useState(() => createClientRequestKey());
  const paymentStudentId = paymentStudent?.id;
  const { paymentState } = useManagerPaymentDetailState({
    t,
    paymentModalOpen,
    paymentStudentId,
  });
  const { mergedPaymentPreview, serverPreviewState } = useManagerPaymentPreviewState({
    paymentModalOpen,
    paymentModalTab,
    paymentStudentId,
    paymentForm,
    paymentState,
  });
  const {
    paymentActionLoading,
    handleSubmitPayment,
    handleCreateImtiyoz,
    handleDeactivateImtiyoz,
    handleRevertPayment,
  } = useManagerPaymentMutations({
    t,
    paymentStudentId,
    paymentForm,
    imtiyozForm,
    paymentRequestKey,
    setPaymentRequestKey,
    setPaymentForm,
    setImtiyozForm,
  });

  function openPaymentHistory(row) {
    const nextState = buildManagerPaymentModalState(row);
    setPaymentStudent(row);
    setPaymentModalTab('payment');
    setPaymentForm(nextState.paymentForm);
    setImtiyozForm(nextState.imtiyozForm);
    setPaymentRequestKey(createClientRequestKey());
    setPaymentModalOpen(true);
  }

  function closePaymentModal() {
    setPaymentModalOpen(false);
    setPaymentModalTab('payment');
    setPaymentStudent(null);
    setPaymentRequestKey(createClientRequestKey());
  }

  function fillAllDebtIntoPaymentForm() {
    if (!paymentStudent) return;
    setPaymentForm((prev) => ({
      ...prev,
      turi: 'OYLIK',
      startMonth: firstManagerDebtMonth(paymentStudent),
      oylarSoni: Math.max(1, Number(paymentStudent.qarzOylarSoni || 1)),
      summa: '',
    }));
  }

  return {
    paymentModalOpen,
    paymentModalTab,
    setPaymentModalTab,
    paymentStudent,
    paymentForm,
    setPaymentForm,
    imtiyozForm,
    setImtiyozForm,
    paymentState,
    mergedPaymentPreview,
    serverPreviewState,
    paymentActionLoading,
    openPaymentHistory,
    closePaymentModal,
    handleSubmitPayment,
    handleCreateImtiyoz,
    handleDeactivateImtiyoz,
    handleRevertPayment,
    fillAllDebtIntoPaymentForm,
    firstDebtMonth: firstManagerDebtMonth,
  };
}
