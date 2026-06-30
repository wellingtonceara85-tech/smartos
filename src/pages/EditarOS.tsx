import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { useEmpresa } from "../contexts/EmpresaContext";
import { useOrdemServico } from "../hooks/useOrdemServico";
import { maskCurrencyInput } from "../lib/masks";
import { formatOsNumero } from "../lib/osNumero";

interface FormErrors {
  defeitoRelatado?: string;
  marca?: string;
  modelo?: string;
  prazoPrevisto?: string;
}

export function EditarOS() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, empresaId } = useEmpresa();
  const { ordem, loading, error } = useOrdemServico(id);

  const [defeitoRelatado, setDefeitoRelatado] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [prazoPrevisto, setPrazoPrevisto] = useState("");
  const [valorDisplay, setValorDisplay] = useState("");
  const [valorCents, setValorCents] = useState(0);
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!ordem) return;
    setDefeitoRelatado(ordem.defeitoRelatado ?? "");
    setDiagnostico(ordem.diagnostico ?? "");
    setMarca(ordem.equipamentoMarca ?? "");
    setModelo(ordem.equipamentoModelo ?? "");
    setNumeroSerie(ordem.equipamentoNumeroSerie ?? "");
    setObservacoesInternas(ordem.observacoesInternas ?? "");

    if (ordem.prazoPrevisto) {
      const d = ordem.prazoPrevisto.toDate();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setPrazoPrevisto(`${yyyy}-${mm}-${dd}`);
    }

    if (ordem.valorOrcamento !== undefined) {
      const cents = Math.round(ordem.valorOrcamento * 100);
      const display = (cents / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setValorDisplay(display);
      setValorCents(cents);
    }
  }, [ordem]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!defeitoRelatado.trim()) next.defeitoRelatado = "O defeito relatado é obrigatório.";
    if (!marca.trim()) next.marca = "Preencha a marca do equipamento.";
    if (!modelo.trim()) next.modelo = "Preencha o modelo do equipamento.";
    if (prazoPrevisto && ordem?.dataAbertura) {
      const abertura = ordem.dataAbertura.toDate();
      abertura.setHours(0, 0, 0, 0);
      if (new Date(prazoPrevisto) < abertura) {
        next.prazoPrevisto = "O prazo previsto deve ser igual ou posterior à data de abertura.";
      }
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setSuccessMsg("");

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!id) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "ordens", id), {
        defeitoRelatado: defeitoRelatado.trim(),
        ...(diagnostico.trim() ? { diagnostico: diagnostico.trim() } : { diagnostico: "" }),
        equipamentoMarca: marca.trim(),
        equipamentoModelo: modelo.trim(),
        ...(numeroSerie.trim()
          ? { equipamentoNumeroSerie: numeroSerie.trim() }
          : { equipamentoNumeroSerie: "" }),
        ...(observacoesInternas.trim()
          ? { observacoesInternas: observacoesInternas.trim() }
          : { observacoesInternas: "" }),
        ...(prazoPrevisto
          ? { prazoPrevisto: Timestamp.fromDate(new Date(prazoPrevisto)) }
          : { prazoPrevisto: null }),
        ...(valorCents > 0 ? { valorOrcamento: valorCents / 100 } : { valorOrcamento: null }),
      });
      setSuccessMsg("OS atualizada.");
      setTimeout(() => navigate(`/ordens/${id}`), 800);
    } catch {
      setFormError("Não foi possível salvar. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Editar OS">
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (error || !ordem || (empresaId && ordem.empresaId !== empresaId)) {
    return (
      <AppShell title="Editar OS">
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error ? "Não foi possível carregar a OS. Tente novamente." : "OS não encontrada."}
        </p>
      </AppShell>
    );
  }

  if (role !== "admin") {
    return (
      <AppShell title="Editar OS">
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          Apenas administradores podem editar uma OS.
        </p>
      </AppShell>
    );
  }

  if (ordem.status === "Concluída" || ordem.status === "Cancelada") {
    return (
      <AppShell title="Editar OS">
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          Não é possível editar uma OS {ordem.status.toLowerCase()}.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Editar ${formatOsNumero(ordem.numero)}`}>
      <form className="max-w-2xl space-y-8" onSubmit={handleSubmit} noValidate>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Equipamento
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="marca"
              label="Marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              error={errors.marca}
              maxLength={50}
              disabled={saving}
            />
            <Input
              id="modelo"
              label="Modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              error={errors.modelo}
              maxLength={100}
              disabled={saving}
            />
            <Input
              id="numero-serie"
              label="Número de série (opcional)"
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              maxLength={50}
              disabled={saving}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Serviço
          </h2>
          <div className="space-y-4">
            <Textarea
              id="defeito-relatado"
              label="Defeito relatado"
              value={defeitoRelatado}
              onChange={(e) => setDefeitoRelatado(e.target.value)}
              error={errors.defeitoRelatado}
              maxLength={500}
              disabled={saving}
            />
            <Textarea
              id="diagnostico"
              label="Diagnóstico técnico (opcional)"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              maxLength={500}
              disabled={saving}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="prazo-previsto"
                label="Prazo previsto (opcional)"
                type="date"
                value={prazoPrevisto}
                onChange={(e) => setPrazoPrevisto(e.target.value)}
                error={errors.prazoPrevisto}
                disabled={saving}
              />
              <Input
                id="valor-orcamento"
                label="Valor do orçamento (opcional)"
                value={valorDisplay}
                onChange={(e) => {
                  const { display, cents } = maskCurrencyInput(e.target.value);
                  setValorDisplay(display);
                  setValorCents(cents);
                }}
                placeholder="0,00"
                disabled={saving}
              />
            </div>
            <Textarea
              id="observacoes-internas"
              label="Observações internas (opcional)"
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              maxLength={500}
              disabled={saving}
            />
          </div>
        </section>

        {successMsg && (
          <p className="rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#16A34A]">{successMsg}</p>
        )}
        {formError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{formError}</p>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            Salvar alterações
          </Button>
          <button
            type="button"
            onClick={() => navigate(`/ordens/${id}`)}
            disabled={saving}
            className="text-sm text-slate-600 hover:underline"
          >
            Cancelar
          </button>
        </div>
      </form>
    </AppShell>
  );
}
