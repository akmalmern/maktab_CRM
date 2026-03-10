import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import Button from './Button';

export default function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  widthClassName = 'max-w-xl',
}) {
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
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div className="absolute inset-y-0 right-0 flex w-full justify-end p-2 sm:p-4">
        <div
          ref={panelRef}
          className={`flex h-full w-full ${widthClassName} flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/50`}
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h3 id={titleId} className="truncate text-lg font-semibold tracking-tight text-slate-900">
                {translateText(t, title)}
              </h3>
              {subtitle ? (
                <p id={subtitleId} className="mt-1 text-sm text-slate-500">
                  {translateText(t, subtitle)}
                </p>
              ) : null}
            </div>
            <Button ref={closeButtonRef} variant="secondary" size="sm" onClick={onClose}>
              {t('Yopish')}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
