import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_CONFIRM_STATE = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Tasdiqlash',
  cancelLabel: 'Bekor qilish',
  confirmVariant: 'danger',
};

export default function useAsyncConfirm() {
  const resolverRef = useRef(null);
  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

  const resolveConfirm = useCallback((result) => {
    setConfirmState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const askConfirm = useCallback((options) => {
    const next = typeof options === 'string' ? { message: options } : options || {};
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        open: true,
        title: next.title || '',
        message: next.message || '',
        confirmLabel: next.confirmLabel || 'Tasdiqlash',
        cancelLabel: next.cancelLabel || 'Bekor qilish',
        confirmVariant: next.confirmVariant || 'danger',
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    },
    [],
  );

  return {
    askConfirm,
    confirmModalProps: {
      open: confirmState.open,
      title: confirmState.title,
      message: confirmState.message,
      confirmLabel: confirmState.confirmLabel,
      cancelLabel: confirmState.cancelLabel,
      confirmVariant: confirmState.confirmVariant,
      onCancel: () => resolveConfirm(false),
      onConfirm: () => resolveConfirm(true),
    },
  };
}
