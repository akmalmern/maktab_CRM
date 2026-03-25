import { useMemo, useState } from 'react';
import {
  useGetFinanceStudentDetailQuery,
  usePreviewFinancePaymentMutation,
} from '../../../../../services/api/financeApi';
import { normalizeFinanceStudentDetailState } from '../../../../shared/finance/financeReadModel';
import { useDebouncedPaymentPreview } from '../../../../shared/finance/useDebouncedPaymentPreview';
import {
  buildFinancePaymentPreview,
  mergeServerPaymentPreview,
} from './paymentPreviewModel';
import {
  buildPaymentPayloadFromForm,
  createClientRequestKey,
  createDefaultImtiyozForm,
  createDefaultPaymentForm,
} from './financeSectionModel';

function useFinancePaymentPreview({
  detailStudent,
  isSelectedDetailReady,
  paymentForm,
  oylikTarif,
}) {
  return useMemo(() => {
    if (!detailStudent || !isSelectedDetailReady) return null;
    return buildFinancePaymentPreview({ detailStudent, paymentForm, oylikTarif });
  }, [detailStudent, isSelectedDetailReady, paymentForm, oylikTarif]);
}

export default function useFinancePaymentFlow({
  studentsState,
  studentsSummary,
  settings,
  onCreatePayment,
  onCreateImtiyoz,
  onDeactivateImtiyoz,
  t,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState('payment');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentRequestKey, setPaymentRequestKey] = useState('');
  const [previewFinancePayment] = usePreviewFinancePaymentMutation();
  const [paymentForm, setPaymentForm] = useState(createDefaultPaymentForm);
  const [imtiyozForm, setImtiyozForm] = useState(createDefaultImtiyozForm);
  const detailQuery = useGetFinanceStudentDetailQuery(selectedStudentId, {
    skip: !modalOpen || !selectedStudentId,
  });

  const students = useMemo(() => studentsState.items || [], [studentsState.items]);
  const detailState = useMemo(
    () =>
      normalizeFinanceStudentDetailState({
        data: detailQuery.data,
        loading:
          detailQuery.isLoading ||
          detailQuery.isFetching ||
          (modalOpen && Boolean(selectedStudentId) && detailQuery.isUninitialized),
        error: detailQuery.error,
      }),
    [
      detailQuery.data,
      detailQuery.error,
      detailQuery.isFetching,
      detailQuery.isLoading,
      detailQuery.isUninitialized,
      modalOpen,
      selectedStudentId,
    ],
  );
  const detailStudent = detailState.student;
  const detailImtiyozlar = useMemo(() => detailState.imtiyozlar || [], [detailState.imtiyozlar]);
  const isSelectedDetailReady =
    Boolean(selectedStudentId) &&
    Boolean(detailStudent) &&
    String(detailStudent?.id) === String(selectedStudentId);

  const localPaymentPreview = useFinancePaymentPreview({
    detailStudent,
    isSelectedDetailReady,
    paymentForm,
    oylikTarif: studentsSummary?.tarifOylikSumma || settings?.oylikSumma || 0,
  });
  const financePreviewPayload = useMemo(() => {
    if (!isSelectedDetailReady || !paymentForm.startMonth) return null;
    return buildPaymentPayloadFromForm(paymentForm, paymentRequestKey);
  }, [isSelectedDetailReady, paymentForm, paymentRequestKey]);
  const serverPreviewState = useDebouncedPaymentPreview({
    enabled: modalOpen && paymentModalTab === 'payment' && Boolean(selectedStudentId),
    studentId: selectedStudentId,
    payload: financePreviewPayload,
    requestPreview: ({ studentId, payload }) =>
      previewFinancePayment({ studentId, payload }).unwrap(),
    debounceMs: 250,
  });
  const paymentPreview = useMemo(
    () => mergeServerPaymentPreview(localPaymentPreview, serverPreviewState.data),
    [localPaymentPreview, serverPreviewState.data],
  );

  function openPaymentModal(studentId) {
    setSelectedStudentId(studentId);
    setPaymentModalTab('payment');
    setPaymentRequestKey(createClientRequestKey());
    setPaymentForm(createDefaultPaymentForm());
    setImtiyozForm(createDefaultImtiyozForm());
    setModalOpen(true);
  }

  function handleModalOpen(nextOpen) {
    setModalOpen(nextOpen);
    if (!nextOpen) {
      setSelectedStudentId('');
    }
  }

  async function handleCreatePayment(event) {
    event.preventDefault();
    const payload = buildPaymentPayloadFromForm(paymentForm, paymentRequestKey);
    const ok = await onCreatePayment(selectedStudentId, payload);
    if (ok) {
      setPaymentRequestKey(createClientRequestKey());
    }
  }

  async function handleCreateImtiyoz(event) {
    event.preventDefault();
    const payload = {
      turi: imtiyozForm.turi,
      boshlanishOy: imtiyozForm.boshlanishOy,
      oylarSoni: Number(imtiyozForm.oylarSoni || 1),
      sabab: imtiyozForm.sabab,
      izoh: imtiyozForm.izoh || undefined,
    };
    if (imtiyozForm.turi !== 'TOLIQ_OZOD') {
      payload.qiymat = Number(imtiyozForm.qiymat || 0);
    }

    const ok = await onCreateImtiyoz(selectedStudentId, payload);
    if (ok) {
      setImtiyozForm(createDefaultImtiyozForm());
    }
  }

  async function handleDeactivateImtiyoz(imtiyozId) {
    await onDeactivateImtiyoz(imtiyozId, { sabab: t('Admin tomonidan bekor qilindi') });
  }

  return {
    modalOpen,
    setModalOpen: handleModalOpen,
    paymentModalTab,
    setPaymentModalTab,
    selectedStudentId,
    paymentForm,
    setPaymentForm,
    imtiyozForm,
    setImtiyozForm,
    students,
    detailState,
    detailStudent,
    detailImtiyozlar,
    isSelectedDetailReady,
    paymentPreview,
    serverPreviewState,
    openPaymentModal,
    handleCreatePayment,
    handleCreateImtiyoz,
    handleDeactivateImtiyoz,
  };
}
