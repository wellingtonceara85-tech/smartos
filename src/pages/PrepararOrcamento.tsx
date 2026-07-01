import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { arrayUnion, doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { Plus, Trash2, Send, Save, ChevronLeft } from "lucide-react";
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

const INPUT_CLS =
  "h-9.5 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

const TEXTAREA_CLS =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 resize-none leading-relaxed";

const LABEL_CLS = "text-[13px] font-medium text-slate-700";

const SECTION_TITLE_CLS =
  "text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4";

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

  const [descricaoServicos, setDescricaoServicos] = useState("");
  const [pecas, setPecas] = useState<PecaRow[]>([]);
  const [maoDeObraDisplay, setMaoDeObraDisplay] = useState("");
  const [maoDeObraCents, setMaoDeObraCents] = useState(0);
  const [outrasDespesasDisplay, setOutrasDespesasDisplay] = useState("");
  const [outrasDespesasCents, setOutrasDespesasCents] = useState(0);
  const [descontoDisplay, setDescontoDisplay] = useState("");
  const [descontoCents, setDescontoCents] = useState(0);
  const [prazoExecucao, setPrazoExecucao] = useState("");
  const [garantia, setGarantia] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotos, setFotos] = useState<FotoOS[]>([]);

  // Preenche o formulário uma vez quando os dados do Firestore chegam
  const initialized = useRef(false);
  useEffect(() => {
    if (!ordem || initialized.current) return;
    initialized.current = true;
    const oc = ordem.orcamento;
    if (!oc) return;
    setDescricaoServicos(oc.descricaoServicos ?? "");
    setPecas(
      (oc.pecas ?? []).map((p) => ({
        descricao: p.descricao,
        valorDisplay: centsToDisplay(p.valor),
        valorCents: Math.round(p.valor * 100),
      }))
    );
    const mdoDisplay = centsToDisplay(oc.maoDeObra);
    setMaoDeObraDisplay(mdoDisplay);
    setMaoDeObraCents(Math.round(oc.maoDeObra * 100));
    const odDisplay = centsToDisplay(oc.outrasDespesas);
    setOutrasDespesasDisplay(odDisplay);
    setOutrasDespesasCents(Math.round(oc.outrasDespesas * 100));
    const descDisplay = centsToDisplay(oc.desconto);
    setDescontoDisplay(descDisplay);
    setDescontoCents(Math.round(oc.desconto * 100));
    setPrazoExecucao(oc.prazoExecucao ?? "");
    setGarantia(oc.garantia ?? "");
    setObservacoes(oc.observacoes ?? "");
    setFotos(oc.fotos ?? []);
  }, [ordem]);

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

  function buildPayload() {
    return {
      descricaoServicos: descricaoServicos.trim(),
      pecas: pecas
        .filter((p) => p.descricao.trim())
        .map((p) => ({ descricao: p.descricao.trim(), valor: p.valorCents / 100 })),
      maoDeObra: maoDeObraCents / 100,
      outrasDespesas: outrasDespesasCents / 100,
      desconto: descontoCents / 100,
      total: totalCents / 100,
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
        orcamento: buildPayload(),
        valorOrcamento: totalCents / 100,
        updatedAt: serverTimestamp(),
      });
      await reload();
      navigate(`/ordens/${ordem.id}`);
    } catch {
      setErroMsg("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnviarOrcamento() {
    if (!ordem) return;
    setSending(true);
    setErroMsg("");
    try {
      const autor = user?.email ?? "Usuário";
      await updateDoc(doc(db, "ordens", ordem.id), {
        orcamento: buildPayload(),
        valorOrcamento: totalCents / 100,
        status: "Orçamento Enviado",
        updatedAt: serverTimestamp(),
        historico: arrayUnion({
          tipo: "status",
          texto: `Status alterado para "Orçamento Enviado".`,
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
      setErroMsg("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Preparar Orçamento">
        <div className="max-w-2xl space-y-4">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (error || !ordem || (empresaId && ordem.empresaId !== empresaId)) {
    return (
      <AppShell title="Preparar Orçamento">
        <p className="text-sm text-slate-500">OS não encontrada.</p>
      </AppShell>
    );
  }

  const isEnviado = ordem.status === "Orçamento Enviado";

  return (
    <AppShell title={`Orçamento — ${formatOsNumero(ordem.numero)}`}>
      <div className="max-w-2xl space-y-5 pb-32">

        {/* Contexto da OS */}
        <div className="surface-card">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-base font-semibold text-slate-900">{ordem.clienteNome}</p>
              <p className="text-sm text-slate-500">
                {ordem.equipamentoMarca} {ordem.equipamentoModelo}
                {ordem.equipamentoTipo ? ` · ${ordem.equipamentoTipo}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {formatOsNumero(ordem.numero)}
            </span>
          </div>
          {isEnviado && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#2563EB]/8 border border-[#2563EB]/20 px-3 py-2.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
              <p className="text-[13px] text-[#2563EB]">
                Orçamento já enviado. Você pode editar e reenviar.
              </p>
            </div>
          )}
        </div>

        {erroMsg && (
          <div className="rounded-lg border border-[#DC2626]/20 bg-[#DC2626]/8 px-4 py-3">
            <p className="text-sm text-[#DC2626]">{erroMsg}</p>
          </div>
        )}

        {/* Descrição dos serviços */}
        <section className="surface-card">
          <p className={SECTION_TITLE_CLS}>Descrição dos Serviços</p>
          <textarea
            value={descricaoServicos}
            onChange={(e) => setDescricaoServicos(e.target.value)}
            placeholder="Descreva os serviços que serão realizados..."
            rows={4}
            className={TEXTAREA_CLS}
          />
        </section>

        {/* Peças e materiais */}
        <section className="surface-card">
          <div className="flex items-center justify-between mb-4">
            <p className={SECTION_TITLE_CLS} style={{ marginBottom: 0 }}>Peças e Materiais</p>
            <button
              type="button"
              onClick={addPeca}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:shadow active:scale-[0.98]"
            >
              <Plus size={13} strokeWidth={2.5} />
              Adicionar peça
            </button>
          </div>

          {pecas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center">
              <p className="text-sm text-slate-400">Nenhuma peça adicionada.</p>
              <button
                type="button"
                onClick={addPeca}
                className="mt-2 text-[13px] text-[#2563EB] hover:underline"
              >
                + Adicionar primeira peça
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cabeçalho das colunas */}
              <div className="flex gap-2 px-0.5">
                <p className="flex-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Descrição</p>
                <p className="w-32 text-[11px] font-medium uppercase tracking-wide text-slate-400">Valor</p>
                <div className="w-8" />
              </div>

              {pecas.map((peca, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={peca.descricao}
                    onChange={(e) => updatePecaDescricao(i, e.target.value)}
                    placeholder="Ex: Tela LCD, Bateria..."
                    className={`flex-1 ${INPUT_CLS}`}
                  />
                  <div className="relative w-28 sm:w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={peca.valorDisplay}
                      onChange={(e) => updatePecaValor(i, e.target.value)}
                      placeholder="0,00"
                      className={`w-full h-9.5 rounded-lg border border-slate-200 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePeca(i)}
                    className="flex h-9.5 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-all duration-150 hover:bg-[#DC2626]/8 hover:text-[#DC2626]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex justify-end border-t border-slate-100 pt-2">
                <p className="text-[13px] text-slate-500">
                  Subtotal peças:{" "}
                  <span className="font-semibold text-slate-900">{formatCurrency(totalPecasCents / 100)}</span>
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Valores */}
        <section className="surface-card">
          <p className={SECTION_TITLE_CLS}>Valores</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CurrencyField label="Mão de obra" value={maoDeObraDisplay} onChange={handleMaoDeObra} />
            <CurrencyField label="Outras despesas" value={outrasDespesasDisplay} onChange={handleOutrasDespesas} />
            <CurrencyField label="Desconto" value={descontoDisplay} onChange={handleDesconto} />
          </div>

          {/* Total */}
          <div className="mt-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#16A34A] to-[#15803d] px-5 py-4 shadow-sm shadow-green-800/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-green-200">
                  Total do Orçamento
                </p>
                {descontoCents > 0 && (
                  <p className="mt-0.5 text-xs text-green-300 line-through">
                    {formatCurrency(subtotalCents / 100)}
                  </p>
                )}
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(totalCents / 100)}
              </p>
            </div>
          </div>
        </section>

        {/* Prazo e garantia */}
        <section className="surface-card">
          <p className={SECTION_TITLE_CLS}>Prazo e Garantia</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldWrapper label="Prazo de execução">
              <input
                type="text"
                value={prazoExecucao}
                onChange={(e) => setPrazoExecucao(e.target.value)}
                placeholder="Ex: 3 a 5 dias úteis"
                className={INPUT_CLS}
              />
            </FieldWrapper>
            <FieldWrapper label="Garantia">
              <input
                type="text"
                value={garantia}
                onChange={(e) => setGarantia(e.target.value)}
                placeholder="Ex: 90 dias de garantia"
                className={INPUT_CLS}
              />
            </FieldWrapper>
          </div>
        </section>

        {/* Observações ao cliente */}
        <section className="surface-card">
          <div className="flex items-baseline justify-between mb-4">
            <p className={SECTION_TITLE_CLS} style={{ marginBottom: 0 }}>Observações ao Cliente</p>
            <span className="text-[11px] text-slate-400">{observacoes.length}/600</span>
          </div>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Informações adicionais para o cliente (opcional)..."
            rows={3}
            maxLength={600}
            className={TEXTAREA_CLS}
          />
        </section>

        {/* Fotos */}
        <section className="surface-card">
          <p className={SECTION_TITLE_CLS}>Fotos do Orçamento</p>
          <PhotosBlock
            empresaId={empresaId ?? ordem.empresaId}
            osId={ordem.id}
            fotos={fotos}
            canManage
            isAdmin
            onChange={(f) => { setFotos(f); return Promise.resolve(); }}
          />
        </section>
      </div>

      {/* Barra de ações — sticky no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:left-64">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
          <Button
            onClick={handleEnviarOrcamento}
            loading={sending}
            disabled={sending || saving}
          >
            <Send size={14} />
            Enviar Orçamento
          </Button>
          <Button
            variant="ghost"
            onClick={handleSalvarRascunho}
            loading={saving}
            disabled={saving || sending}
          >
            <Save size={14} />
            Salvar rascunho
          </Button>
          <button
            type="button"
            onClick={() => navigate(`/ordens/${ordem.id}`)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors ml-auto"
          >
            <ChevronLeft size={15} />
            Voltar
          </button>
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
    <div className="flex flex-col gap-1.5">
      <label className={LABEL_CLS}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className={`h-9.5 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15`}
        />
      </div>
    </div>
  );
}

function FieldWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

// valor salvo em reais → string para o input mascarado (ex: 50.00 → "5000" → maskCurrencyInput mostra "50,00")
function centsToDisplay(reais: number): string {
  if (!reais) return "";
  return String(Math.round(reais * 100));
}
