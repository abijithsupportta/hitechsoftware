interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title = 'Delete customer',
  description = 'This action will mark the customer as inactive. You can keep historical references.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="ht-btn ht-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="ht-btn ht-btn-danger"
          >
            {isSubmitting ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
