import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

interface CancelOsModalProps {
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

export function CancelOsModal({ onClose, onConfirm }: CancelOsModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (motivo.trim().length < 10) {
      setError("O motivo deve ter no mínimo 10 caracteres.");
      return;
    }
    setSaving(true);
    await onConfirm(motivo.trim());
    setSaving(false);
  }

  return (
    <Modal
      title="Cancelar OS"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} loading={saving}>
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        Essa ação não pode ser desfeita. Explique o motivo do cancelamento.
      </p>
      <Textarea
        id="motivo-cancelamento"
        label="Motivo do cancelamento"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        error={error}
        maxLength={500}
        disabled={saving}
      />
    </Modal>
  );
}
