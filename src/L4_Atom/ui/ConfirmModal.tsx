import { Button, Modal } from './animalIsland';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, body, confirmLabel = 'Continue', danger, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      className="app-modal app-modal--confirm"
      title={title}
      onClose={onCancel}
      maskClosable={false}
      typewriter={false}
      footer={
        <div className="modal-actions">
          <Button ghost htmlType="button" type="primary" onClick={onCancel}>
            Cancel
          </Button>
          <Button htmlType="button" type="primary" danger={danger} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="app-modal-content">
        <p>{body}</p>
      </div>
    </Modal>
  );
}
