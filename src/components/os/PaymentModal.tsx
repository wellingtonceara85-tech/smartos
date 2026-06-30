import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { maskCurrencyInput } from "../../lib/masks";

const FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", "Outros"];

export interface PaymentData {
  valor: number;
  formaPagamento: string;
  dataPagamento: Date;
  observacao: string;
}

interface PaymentModalProps {
  onClose: () => void;
  onConfirm: (data: PaymentData) => Promise<void>;
}

export function PaymentModal({ onClose, onConfirm }: PaymentModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [valorDisplay, setValorDisplay] = useState("");
  const [valorCents, setValorCents] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState(todayStr);
  const [observacao, setObservacao] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    const errs: Record<string, string> = {};
    if (valorCents <= 0) errs.valor = "Informe um valor maior que zero.";
    if (!formaPagamento) errs.forma = "Selecione a forma de pagamento.";
    if (!dataPagamento) {
      errs.data = "Informe a data do pagamento.";
    } else if (dataPagamento > todayStr) {
      errs.data = "A data não pode ser futura.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    await onConfirm({
      valor: valorCents / 100,
      formaPagamento,
      // noon local time evita inversão de dia por fuso horário UTC
      dataPagamento: new Date(`${dataPagamento}T12:00:00`),
      observacao,
    });
    setSaving(false);
  }

  return (
    <Modal
      title="Registrar Pagamento e Concluir OS"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            Confirmar pagamento e concluir OS
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="valor-pagamento"
          label="Valor cobrado"
          value={valorDisplay}
          onChange={(e) => {
            const { display, cents } = maskCurrencyInput(e.target.value);
            setValorDisplay(display);
            setValorCents(cents);
            if (errors.valor) setErrors((p) => ({ ...p, valor: "" }));
          }}
          error={errors.valor}
          placeholder="0,00"
          disabled={saving}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="forma-pagamento" className="text-[13px] font-medium text-slate-700">
            Forma de pagamento
          </label>
          <select
            id="forma-pagamento"
            value={formaPagamento}
            onChange={(e) => {
              setFormaPagamento(e.target.value);
              if (errors.forma) setErrors((p) => ({ ...p, forma: "" }));
            }}
            disabled={saving}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          >
            <option value="">Selecione</option>
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma} value={forma}>
                {forma}
              </option>
            ))}
          </select>
          {errors.forma && <p className="text-xs text-[#DC2626]">{errors.forma}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="data-pagamento" className="text-[13px] font-medium text-slate-700">
            Data do pagamento
          </label>
          <input
            id="data-pagamento"
            type="date"
            value={dataPagamento}
            max={todayStr}
            onChange={(e) => {
              setDataPagamento(e.target.value);
              if (errors.data) setErrors((p) => ({ ...p, data: "" }));
            }}
            disabled={saving}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
          {errors.data && <p className="text-xs text-[#DC2626]">{errors.data}</p>}
        </div>

        <Textarea
          id="observacao-pagamento"
          label="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          maxLength={500}
          disabled={saving}
        />
      </div>
    </Modal>
  );
}
