import Button from './Button';
import Modal from './Modal';

export default function ConfirmModal({ open, title = 'Tasdiqlash', message, onConfirm, onCancel, loading }) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-md" title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Bekor qilish
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          Tasdiqlash
        </Button>
      </div>
    </Modal>
  );
}
