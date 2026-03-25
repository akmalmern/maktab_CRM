import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

export default function PromptModal({
  open,
  title = 'Qiymat kiriting',
  message,
  label,
  value,
  onChange,
  onConfirm,
  onCancel,
  loading,
  placeholder,
  inputType = 'text',
  confirmLabel = 'Saqlash',
  cancelLabel = 'Bekor qilish',
  confirmVariant = 'primary',
  confirmDisabled = false,
}) {
  const { t } = useTranslation();

  function handleSubmit(event) {
    event.preventDefault();
    if (loading || confirmDisabled) return;
    onConfirm();
  }

  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-md" title={translateText(t, title)}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {message ? <p className="text-sm leading-6 text-slate-600">{translateText(t, message)}</p> : null}
        <label className="block space-y-1.5">
          {label ? (
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {translateText(t, label)}
            </span>
          ) : null}
          <Input
            autoFocus
            type={inputType}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {translateText(t, cancelLabel)}
          </Button>
          <Button
            type="submit"
            variant={confirmVariant}
            disabled={loading || confirmDisabled}
          >
            {translateText(t, confirmLabel)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
