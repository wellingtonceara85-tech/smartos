import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { maskCurrencyInput } from "../../lib/masks";
import { formatCurrency } from "../../lib/format";
import type { PixConfig } from "../../contexts/EmpresaContext";

const FORMAS = [
  "PIX",
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Transferência",
  "Boleto",
  "Outro",
];

export interface PaymentData {
  valor: number;
  acrescimo: number;
  desconto: number;
  totalPago: number;
  formaPagamento: string;
  dataPagamento: Date;
  observacao: string;
}

interface PaymentModalProps {
  valorOrcamento: number;
  pix: PixConfig | null;
  onClose: () => void;
  onConfirm: (data: PaymentData) => Promise<void>;
}

export function PaymentModal({ valorOrcamento, pix, onClose, onConfirm }: PaymentModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [valorDisplay, setValorDisplay] = useState(
    valorOrcamento > 0 ? (valorOrcamento).toFixed(2).replace(".", ",") : ""
  );
  const [valorCents, setValorCents] = useState(Math.round(valorOrcamento * 100));

  const [acrescimoDisplay, setAcrescimoDisplay] = useState("");
  const [acrescimoCents, setAcrescimoCents] = useState(0);
  const [descontoDisplay, setDescontoDisplay] = useState("");
  const [descontoCents, setDescontoCents] = useState(0);

  const [forma, setForma] = useState("");
  const [dataPagamento, setDataPagamento] = useState(todayStr);
  const [observacao, setObservacao] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalPagoCents = valorCents + acrescimoCents - descontoCents;
  const totalPago = Math.max(0, totalPagoCents) / 100;

  function handleValor(raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setValorDisplay(display);
    setValorCents(cents);
    setErrors((p) => ({ ...p, valor: "" }));
  }

  function handleAcrescimo(raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setAcrescimoDisplay(display);
    setAcrescimoCents(cents);
  }

  function handleDesconto(raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setDescontoDisplay(display);
    setDescontoCents(cents);
  }

  function copyPix() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.chave).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleConfirm() {
    const errs: Record<string, string> = {};
    if (valorCents <= 0) errs.valor = "Informe um valor maior que zero.";
    if (!forma) errs.forma = "Selecione a forma de pagamento.";
    if (!dataPagamento) errs.data = "Informe a data.";
    else if (dataPagamento > todayStr) errs.data = "A data não pode ser futura.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    await onConfirm({
      valor: valorCents / 100,
      acrescimo: acrescimoCents / 100,
      desconto: descontoCents / 100,
      totalPago,
      formaPagamento: forma,
      dataPagamento: new Date(`${dataPagamento}T12:00:00`),
      observacao,
    });
    setSaving(false);
  }

  const showPix = forma === "PIX" && pix;

  return (
    <Modal
      title="Registrar Recebimento"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            Confirmar recebimento
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Valor */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-700">
              Valor cobrado
              {valorOrcamento > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (orçamento: {formatCurrency(valorOrcamento)})
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={valorDisplay}
                onChange={(e) => handleValor(e.target.value)}
                placeholder="0,00"
                className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </div>
            {errors.valor && <p className="text-xs text-[#DC2626]">{errors.valor}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CurrencyMini label="Acréscimo (opcional)" value={acrescimoDisplay} onChange={handleAcrescimo} />
            <CurrencyMini label="Desconto (opcional)" value={descontoDisplay} onChange={handleDesconto} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-600">Total a receber</span>
            <span className="text-base font-bold text-[#16A34A]">{formatCurrency(totalPago)}</span>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-slate-700">Forma de pagamento</span>
          <div className="flex flex-wrap gap-2">
            {FORMAS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setForma(f); setErrors((p) => ({ ...p, forma: "" })); }}
                className={`rounded-full border px-3 py-1 text-sm transition-all duration-150 ${
                  forma === f
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-slate-200 text-slate-700 hover:border-[#2563EB]/40 hover:text-[#2563EB]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {errors.forma && <p className="text-xs text-[#DC2626]">{errors.forma}</p>}
        </div>

        {/* Card PIX — aparece quando PIX selecionado */}
        {showPix && (
          <div className="rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]">
              Dados para pagamento PIX
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PixField label="Chave" value={pix.chave} />
              {pix.tipo && <PixField label="Tipo" value={pix.tipo} />}
              {pix.favorecido && <PixField label="Favorecido" value={pix.favorecido} />}
              {pix.banco && <PixField label="Banco" value={pix.banco} />}
            </div>
            <button
              type="button"
              onClick={copyPix}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150 ${
                copied
                  ? "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]"
                  : "border-[#2563EB]/30 bg-white text-[#2563EB] hover:bg-[#2563EB]/10"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Chave copiada!" : "Copiar chave PIX"}
            </button>
          </div>
        )}

        {/* Data */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-slate-700">Data do recebimento</label>
          <input
            type="date"
            value={dataPagamento}
            max={todayStr}
            onChange={(e) => { setDataPagamento(e.target.value); setErrors((p) => ({ ...p, data: "" })); }}
            className="h-9.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
          {errors.data && <p className="text-xs text-[#DC2626]">{errors.data}</p>}
        </div>

        {/* Observação */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-slate-700">Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={300}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

function CurrencyMini({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-slate-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className="h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
        />
      </div>
    </div>
  );
}

function PixField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 break-all">{value}</p>
    </div>
  );
}
