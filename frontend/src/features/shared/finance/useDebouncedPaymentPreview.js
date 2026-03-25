import { useEffect, useState } from 'react';

export function useDebouncedPaymentPreview({
  enabled,
  studentId,
  payload,
  requestPreview,
  debounceMs = 250,
}) {
  const isActive = Boolean(enabled && studentId && payload);
  const [state, setState] = useState({
    loading: false,
    error: '',
    data: null,
  });

  useEffect(() => {
    if (!isActive) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const result = await requestPreview({ studentId, payload });
        if (!cancelled) {
          setState({
            loading: false,
            error: '',
            data: result?.preview || null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || '',
            data: null,
          });
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [debounceMs, isActive, payload, requestPreview, studentId]);

  if (!isActive) {
    return { loading: false, error: '', data: null };
  }

  return state;
}
