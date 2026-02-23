import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import Button from './Button';
import Modal from './Modal';

export default function ConfirmModal({ open, title = 'Tasdiqlash', message, onConfirm, onCancel, loading }) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-md" title={translateText(t, title)}>
      <p className="text-sm leading-6 text-slate-600">{translateText(t, message)}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {t('Bekor qilish')}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {t('Tasdiqlash')}
        </Button>
      </div>
    </Modal>
  );
}
