import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm }: ConfirmModalProps) {
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
