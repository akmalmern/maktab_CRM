import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import Button from './Button';

export default function Modal({ open, title, subtitle, onClose, children, maxWidth = 'max-w-3xl' }) {
  const { t } = useTranslation();
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`w-full ${maxWidth} rounded-xl bg-white shadow-xl`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 id={titleId} className="text-lg font-bold text-slate-900">
              {translateText(t, title)}
            </h3>
            {subtitle && (
              <p id={subtitleId} className="text-sm text-slate-500">
                {translateText(t, subtitle)}
              </p>
            )}
          </div>
          <Button ref={closeButtonRef} variant="secondary" size="sm" onClick={onClose}>
            {t('Yopish')}
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
