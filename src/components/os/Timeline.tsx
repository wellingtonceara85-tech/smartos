import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import { getStatusVariant } from "../../lib/osStatus";
import type { BadgeVariant } from "../ui/Badge";
import type { HistoricoItem } from "../../types/ordemServico";

const DOT_CLASSES: Record<BadgeVariant, string> = {
  success: "border-[#16A34A] bg-[#16A34A]",
  warning: "border-[#D97706] bg-[#D97706]",
  error: "border-[#DC2626] bg-[#DC2626]",
  info: "border-[#0284C7] bg-[#0284C7]",
  neutral: "border-slate-400 bg-slate-400",
};

interface TimelineProps {
  historico: HistoricoItem[];
  canAddObservation: boolean;
  onAddObservation: (texto: string) => Promise<void>;
}

export function Timeline({ historico, canAddObservation, onAddObservation }: TimelineProps) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!texto.trim()) return;
    setSaving(true);
    await onAddObservation(texto.trim());
    setTexto("");
    setSaving(false);
  }

  const ordenado = [...historico].sort(
    (a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis(),
  );

  return (
    <div>
      {ordenado.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">Nenhuma atualização registrada ainda.</p>
      ) : (
        <ul className="mb-4 space-y-4 border-l-2 border-slate-100 pl-5">
          {ordenado.map((item, index) => (
            <li key={index} className="relative">
              <span
                className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 bg-white ${
                  item.tipo === "status" && item.statusNovo
                    ? DOT_CLASSES[getStatusVariant(item.statusNovo)]
                    : "border-slate-300 bg-slate-300"
                }`}
              />
              {item.tipo === "observacao" && (
                <MessageSquare size={12} className="absolute -left-[22.5px] top-[5px] text-white" />
              )}
              <p className="text-sm font-medium text-slate-800">{item.texto}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.autor} — {item.criadoEm.toDate().toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canAddObservation && (
        <div className="space-y-2">
          <Textarea
            id="nova-observacao"
            label="Nova observação"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={1000}
            disabled={saving}
          />
          <Button onClick={handleSubmit} loading={saving} disabled={!texto.trim()}>
            Registrar
          </Button>
        </div>
      )}
    </div>
  );
}
