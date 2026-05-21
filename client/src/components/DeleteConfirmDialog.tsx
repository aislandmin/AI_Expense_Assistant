interface DeleteConfirmDialogProps {
  isOpen: boolean;
  itemName: string;
  itemDetails?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  isOpen,
  itemName,
  itemDetails,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <div className="panel-header">
          <h2 id="delete-dialog-title">Delete this entry?</h2>
          <p>Deleting an expense cannot be undone. Confirm to remove it from your records.</p>
        </div>
        <div className="delete-summary">
          <strong>{itemName}</strong>
          {itemDetails && <span>{itemDetails}</span>}
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteConfirmDialog;
