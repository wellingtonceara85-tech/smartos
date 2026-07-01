import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { arrayUnion, doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { PhotosBlock } from "../components/os/PhotosBlock";
import { useAuth } from "../contexts/AuthContext";
import { useEmpresa } from "../contexts/EmpresaContext";
import { useOrdemServico } from "../hooks/useOrdemServico";
import { formatOsNumero } from "../lib/osNumero";
import { formatCurrency } from "../lib/format";
import { maskCurrencyInput } from "../lib/masks";
import { buildOrcamentoWhatsAppMessage } from "../lib/whatsappMessage";
import type { FotoOS } from "../types/ordemServico";

interface PecaRow {
  descricao: string;
  valorDisplay: string;
  valorCents: number;
}

export function PrepararOrcamento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { empresaId, empresaNome } = useEmpresa();
  const { ordem, loading, error, reload } = useOrdemServico(id);

  // Pre-fill from existing orcamento if present
  const oc = ordem?.orcamento;

  const [descricaoServicos, setDescricaoServicos] = useState(oc?.descricaoServicos ?? "");
  const [pecas, setPecas] = useState<PecaRow[]>(() =>
    (oc?.pecas ?? []).map((p) => ({
      descricao: p.descricao,
      valorDisplay: formatCurrency(p.valor).replace("R$ ", "").replace("R$ ", ""),
      valorCents: p.valor,
    }))
  );
  const [maoDeObraDisplay, setMaoDeObraDisplay] = useState(
    oc ? formatCurrency(oc.maoDeObra).replace("R$ ", "").replace("R$ ", "") : ""
  );
  const [maoDeObraCents, setMaoDeObraCents] = useState(oc?.maoDeObra ?? 0);
  const [outrasDespesasDisplay, setOutrasDespesasDisplay] = useState(
    oc ? formatCurrency(oc.outrasDespesas).replace("R$ ", "").replace("R$ ", "") : ""
  );
  const [outrasDespesasCents, setOutrasDespesasCents] = useState(oc?.outrasDespesas ?? 0);
  const [descontoDisplay, setDescontoDisplay] = useState(
    oc ? formatCurrency(oc.desconto).replace("R$ ", "").replace("R$ ", "") : ""
  );
  const [descontoCents, setDescontoCents] = useState(oc?.desconto ?? 0);
  const [prazoExecucao, setPrazoExecucao] = useState(oc?.prazoExecucao ?? "");
  const [garantia, setGarantia] = useState(oc?.garantia ?? "");
  const [observacoes, setObservacoes] = useState(oc?.observacoes ?? "");
  const [fotos, setFotos] = useState<FotoOS[]>(oc?.fotos ?? []);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [erroMsg, setErroMsg] = useState("");

  const totalPecasCents = pecas.reduce((s, p) => s + p.valorCents, 0);
  const subtotalCents = maoDeObraCents + totalPecasCents + outrasDespesasCents;
  const totalCents = Math.max(0, subtotalCents - descontoCents);

  function addPeca() {
    setPecas((prev) => [...prev, { descricao: "", valorDisplay: "", valorCents: 0 }]);
  }

  function removePeca(index: number) {
    setPecas((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePecaDescricao(index: number, value: string) {
    setPecas((prev) => prev.map((p, i) => (i === index ? { ...p, descricao: value } : p)));
  }

  function updatePecaValor(index: number, raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setPecas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, valorDisplay: display, valorCents: cents } : p))
    );
  }

  function handleMaoDeObra(raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setMaoDeObraDisplay(display);
    setMaoDeObraCents(cents);
  }

  function handleOutrasDespesas(raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setOutrasDespesasDisplay(display);
    setOutrasDespesasCents(cents);
  }

  function handleDesconto(raw: string) {
    const { display, cents } = maskCurrencyInput(raw);
    setDescontoDisplay(display);
    setDescontoCents(cents);
  }

  function buildOrcamentoPayload() {
    return {
      descricaoServicos: descricaoServicos.trim(),
      pecas: pecas
        .filter((p) => p.descricao.trim())
        .map((p) => ({ descricao: p.descricao.trim(), valor: p.valorCents })),
      maoDeObra: maoDeObraCents,
      outrasDespesas: outrasDespesasCents,
      desconto: descontoCents,
      total: totalCents,
      prazoExecucao: prazoExecucao.trim(),
      garantia: garantia.trim(),
      observacoes: observacoes.trim(),
      fotos,
      criadoEm: Timestamp.now(),
    };
  }

  async function handleSalvarRascunho() {
    if (!ordem) return;
    setSaving(true);
    setErroMsg("");
    try {
      await updateDoc(doc(db, "ordens", ordem.id), {
        orcamento: buildOrcamentoPayload(),
        valorOrcamento: totalCents,
        updatedAt: serverTimestamp(),
      });
      await reload();
      navigate(`/ordens/${ordem.id}`);
    } catch {
      setErroMsg("Nao foi possivel salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnviarOrcamento() {
    if (!ordem) return;
    setSending(true);
    setErroMsg("");
    try {
      const autor = user?.email ?? "Usuario";
      const payload = buildOrcamentoPayload();
      await updateDoc(doc(db, "ordens", ordem.id), {
        orcamento: payload,
        valorOrcamento: totalCents,
        status: "Orçamento Enviado",
        updatedAt: serverTimestamp(),
        historico: arrayUnion({
          tipo: "status",
          texto: `Status alterado para "Orcamento Enviado".`,
          autor,
          criadoEm: Timestamp.now(),
          statusNovo: "Orçamento Enviado",
        }),
      });

      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const link = `${window.location.origin}${base}/track/${ordem.token}`;
      const msg = buildOrcamentoWhatsAppMessage({
        clienteNome: ordem.clienteNome,
        numero: formatOsNumero(ordem.numero),
        link,
        empresaNome,
      });
      const tel = ordem.clienteTelefone?.replace(/\D/g, "");
      const waUrl = tel
        ? `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");

      navigate(`/ordens/${ordem.id}`);
    } catch {
      setErroMsg("Nao foi possivel enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Preparar Orcamento">
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (error || !ordem || (empresaId && ordem.empresaId !== empresaId)) {
    return (
      <AppShell title="Preparar Orcamento">
        <p className="text-sm text-slate-500">OS nao encontrada.</p>
      </AppShell>
    );
  }

  const isEnviado = ordem.status === "Orçamento Enviado";

  return (
    <AppShell title={`Orcamento — ${formatOsNumero(ordem.numero)}`}>
      <div className="max-w-2xl space-y-6">
        {/* Header info */}
        <div className="surface-card">
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-900">{ordem.clienteNome}</span>
            {" · "}
            {ordem.equipamentoMarca} {ordem.equipamentoModelo}
          </p>
          {isEnviado && (
            <p className="mt-2 rounded-md bg-[#2563EB]/8 px-3 py-2 text-sm text-[#2563EB]">
              Este orcamento ja foi enviado ao cliente. Voce pode editar e reenviar.
            </p>
          )}
        </div>

        {erroMsg && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{erroMsg}</p>
        )}

        {/* Descricao dos servicos */}
        <section className="surface-card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Descricao dos Servicos
          </h3>
          <textarea
            value={descricaoServicos}
            onChange={(e) => setDescricaoServicos(e.target.value)}
            placeholder="Descreva os servicos que serao realizados..."
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 resize-none"
          />
        </section>

        {/* Pecas e materiais */}
        <section className="surface-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Pecas e Materiais
            </h3>
            <button
              type="button"
              onClick={addPeca}
              className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Plus size={13} />
              Adicionar peca
            </button>
          </div>

          {pecas.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma peca adicionada.</p>
          ) : (
            <div className="space-y-2">
              {pecas.map((peca, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={peca.descricao}
                    onChange={(e) => updatePecaDescricao(i, e.target.value)}
                    placeholder="Descricao da peca"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={peca.valorDisplay}
                      onChange={(e) => updatePecaValor(i, e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePeca(i)}
                    className="p-2 text-slate-400 hover:text-[#DC2626] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pecas.length > 0 && (
            <div className="flex justify-end pt-1">
              <p className="text-xs text-slate-500">
                Subtotal pecas: <span className="font-semibold text-slate-900">{formatCurrency(totalPecasCents)}</span>
              </p>
            </div>
          )}
        </section>

        {/* Valores */}
        <section className="surface-card space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Valores</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CurrencyField
              label="Mao de obra"
              value={maoDeObraDisplay}
              onChange={handleMaoDeObra}
            />
            <CurrencyField
              label="Outras despesas"
              value={outrasDespesasDisplay}
              onChange={handleOutrasDespesas}
            />
            <CurrencyField
              label="Desconto"
              value={descontoDisplay}
              onChange={handleDesconto}
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">Total do Orcamento</span>
            <span className="text-lg font-bold text-[#16A34A]">{formatCurrency(totalCents)}</span>
          </div>
        </section>

        {/* Prazo e garantia */}
        <section className="surface-card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Prazo e Garantia
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-slate-700">Prazo de execucao</label>
              <input
                type="text"
                value={prazoExecucao}
                onChange={(e) => setPrazoExecucao(e.target.value)}
                placeholder="Ex: 3 a 5 dias uteis"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-slate-700">Garantia</label>
              <input
                type="text"
                value={garantia}
                onChange={(e) => setGarantia(e.target.value)}
                placeholder="Ex: 90 dias de garantia"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </div>
          </div>
        </section>

        {/* Observacoes */}
        <section className="surface-card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Observacoes ao Cliente
          </h3>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Informacoes adicionais para o cliente..."
            rows={3}
            maxLength={600}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 resize-none"
          />
          <p className="text-xs text-slate-400">{observacoes.length}/600</p>
        </section>

        {/* Fotos do orcamento */}
        <section className="surface-card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Fotos (opcional)
          </h3>
          <PhotosBlock
            empresaId={empresaId ?? ordem.empresaId}
            osId={ordem.id}
            fotos={fotos}
            canManage
            isAdmin
            onChange={(f) => { setFotos(f); return Promise.resolve(); }}
          />
        </section>

        {/* Acoes */}
        <div className="flex flex-wrap gap-3 pb-8">
          <Button onClick={handleEnviarOrcamento} disabled={sending || saving}>
            {sending ? "Enviando..." : "Enviar Orcamento ao Cliente"}
          </Button>
          <Button variant="ghost" onClick={handleSalvarRascunho} disabled={saving || sending}>
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/ordens/${ordem.id}`)}>
            Cancelar
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-medium text-slate-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
        />
      </div>
    </div>
  );
}
