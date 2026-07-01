import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { arrayUnion, doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { Phone, Copy, Check, FileText, ExternalLink, CheckSquare, Download } from "lucide-react";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Timeline } from "../components/os/Timeline";
import { PhotosBlock } from "../components/os/PhotosBlock";
import { SmartTrackLink } from "../components/os/SmartTrackLink";
import { OsPdfActions } from "../components/os/OsPdfActions";
import { CancelOsModal } from "../components/os/CancelOsModal";
import { PaymentModal, type PaymentData } from "../components/os/PaymentModal";
import { ConfirmModal } from "../components/os/ConfirmModal";
import { useAuth } from "../contexts/AuthContext";
import { useEmpresa } from "../contexts/EmpresaContext";
import { useOrdemServico } from "../hooks/useOrdemServico";
import { getNextStatus, getOsPermissions, normalizeStatus } from "../lib/osFlow";
import { getStatusVariant } from "../lib/osStatus";
import { formatCurrency, formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import { generateReciboPdf } from "../lib/pdfGenerator";
import { buildReciboWhatsAppMessage } from "../lib/whatsappMessage";
import type { FotoOS } from "../types/ordemServico";

export function OrdemDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, empresaId, prazoGarantiaDias, pix, nfEmissorUrl, empresaNome, logoUrl } = useEmpresa();
  const { ordem, loading, error, reload } = useOrdemServico(id);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmAdvance, setShowConfirmAdvance] = useState(false);
  const [showNfModal, setShowNfModal] = useState(false);
  const [nfNumeroInput, setNfNumeroInput] = useState("");
  const [nfSaving, setNfSaving] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [reciboPdfBusy, setReciboPdfBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const autor = user?.email ?? "Usuário";

  async function registrarHistorico(extra: Record<string, unknown>, texto: string, statusNovo?: string) {
    if (!ordem) return;
    await updateDoc(doc(db, "ordens", ordem.id), {
      ...extra,
      updatedAt: serverTimestamp(),
      historico: arrayUnion({
        tipo: statusNovo ? "status" : "observacao",
        texto,
        autor,
        criadoEm: Timestamp.now(),
        ...(statusNovo ? { statusNovo } : {}),
      }),
    });
    await reload();
  }

  async function handleAdvance(next: string) {
    setActionError("");
    try {
      const extra: Record<string, unknown> = { status: next };
      await registrarHistorico(extra, `Status alterado para "${next}".`, next);
    } catch {
      setActionError("Não foi possível atualizar a OS. Tente novamente.");
    }
  }

  async function handleCancel(motivo: string) {
    setActionError("");
    try {
      await registrarHistorico(
        { status: "Cancelada", motivoCancelamento: motivo },
        `OS cancelada. Motivo: ${motivo}`,
        "Cancelada",
      );
      setShowCancelModal(false);
    } catch {
      setActionError("Não foi possível cancelar a OS. Tente novamente.");
    }
  }

  async function handlePayment(data: PaymentData) {
    setActionError("");
    if (!ordem) return;
    try {
      const dataFormatada = data.dataPagamento.toLocaleDateString("pt-BR");
      const linhasTexto = [
        `Pagamento registrado: ${formatCurrency(data.totalPago)} via ${data.formaPagamento}`,
        `Data: ${dataFormatada}`,
        ...(data.acrescimo > 0 ? [`Acréscimo: ${formatCurrency(data.acrescimo)}`] : []),
        ...(data.desconto > 0 ? [`Desconto: ${formatCurrency(data.desconto)}`] : []),
        ...(data.observacao ? [`Observação: ${data.observacao}`] : []),
      ];

      await updateDoc(doc(db, "ordens", ordem.id), {
        status: "Recebimento",
        updatedAt: serverTimestamp(),
        pagamento: {
          valor: data.valor,
          acrescimo: data.acrescimo,
          desconto: data.desconto,
          totalPago: data.totalPago,
          formaPagamento: data.formaPagamento,
          data: Timestamp.fromDate(data.dataPagamento),
        },
        historico: arrayUnion({
          tipo: "status",
          texto: linhasTexto.join("\n"),
          autor,
          criadoEm: Timestamp.now(),
          statusNovo: "Recebimento",
        }),
      });
      setShowPaymentModal(false);
      await reload();
    } catch {
      setActionError("Não foi possível registrar o pagamento. Tente novamente.");
    }
  }

  async function handleFinalizarAtendimento() {
    setActionError("");
    if (!ordem) return;
    try {
      await registrarHistorico(
        { status: "Entregue" },
        "Equipamento entregue ao cliente.",
        "Entregue",
      );
    } catch {
      setActionError("Não foi possível atualizar a OS. Tente novamente.");
    }
  }

  async function handleConcluir() {
    setActionError("");
    if (!ordem) return;
    try {
      const conclusaoTs = Timestamp.now();
      const validadeMs = conclusaoTs.toMillis() + prazoGarantiaDias * 24 * 60 * 60 * 1000;
      await updateDoc(doc(db, "ordens", ordem.id), {
        status: "Concluída",
        dataConclusao: conclusaoTs,
        updatedAt: serverTimestamp(),
        garantia: { dataValidade: Timestamp.fromMillis(validadeMs) },
        historico: arrayUnion({
          tipo: "status",
          texto: `OS concluída. Garantia válida até ${new Date(validadeMs).toLocaleDateString("pt-BR")}.`,
          autor,
          criadoEm: conclusaoTs,
          statusNovo: "Concluída",
        }),
      });
      await reload();
    } catch {
      setActionError("Não foi possível concluir a OS. Tente novamente.");
    }
  }

  async function handleNfEmitida() {
    if (!ordem || nfSaving) return;
    setNfSaving(true);
    try {
      await updateDoc(doc(db, "ordens", ordem.id), {
        nfEmitida: true,
        nfNumero: nfNumeroInput.trim() || null,
        updatedAt: serverTimestamp(),
        historico: arrayUnion({
          tipo: "observacao",
          texto: `NF emitida${nfNumeroInput.trim() ? ` — Nº ${nfNumeroInput.trim()}` : ""}.`,
          autor,
          criadoEm: Timestamp.now(),
        }),
      });
      setShowNfModal(false);
      await reload();
    } catch {
      setActionError("Não foi possível salvar os dados da NF.");
    } finally {
      setNfSaving(false);
    }
  }

  async function handleReciboPdf() {
    if (!ordem || reciboPdfBusy) return;
    setReciboPdfBusy(true);
    try {
      const empresaObj = {
        id: empresaId ?? "",
        nome: empresaNome,
        logoUrl: logoUrl ?? undefined,
        criadoEm: ordem.dataAbertura,
      } as import("../types/empresa").Empresa;
      const pdf = await generateReciboPdf(ordem, empresaObj);
      pdf.save(`Recibo_OS_${ordem.numero}.pdf`);
    } catch {
      setActionError("Não foi possível gerar o PDF.");
    } finally {
      setReciboPdfBusy(false);
    }
  }

  function handleReciboWhatsApp() {
    if (!ordem?.pagamento) return;
    const msg = buildReciboWhatsAppMessage({
      clienteNome: ordem.clienteNome,
      numero: formatOsNumero(ordem.numero),
      totalPago: ordem.pagamento.totalPago,
      formaPagamento: ordem.pagamento.formaPagamento,
      empresaNome,
    });
    const telefone = ordem.clienteTelefone?.replace(/\D/g, "");
    const url = telefone
      ? `https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function handleCopyPix() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.chave).then(() => {
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    });
  }

  async function handleAddObservation(texto: string) {
    setActionError("");
    try {
      await registrarHistorico({}, texto);
    } catch {
      setActionError("Não foi possível registrar a observação. Tente novamente.");
    }
  }

  async function handlePhotosChange(fotos: FotoOS[]) {
    if (!ordem) return;
    await updateDoc(doc(db, "ordens", ordem.id), { fotos, updatedAt: serverTimestamp() });
    await reload();
  }

  if (loading) {
    return (
      <AppShell title="Detalhes da OS">
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Detalhes da OS">
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          Não foi possível carregar a OS. Tente novamente.
        </p>
      </AppShell>
    );
  }

  if (!ordem || (empresaId && ordem.empresaId !== empresaId)) {
    return (
      <AppShell title="Detalhes da OS">
        <p className="text-sm text-slate-500">OS não encontrada.</p>
      </AppShell>
    );
  }

  const status = normalizeStatus(ordem.status);
  const permissions = getOsPermissions(status, role);
  const next = getNextStatus(status);
  const isAdmin = role === "admin";

  const RESPOSTA_TEXTO: Record<string, string> = {
    aprovado: "Cliente aprovou o orçamento",
    reprovado: "Cliente não aprovou o orçamento",
    duvida: "Cliente solicitou ajustes no orçamento",
  };

  const historicoComResposta = (() => {
    const base = ordem.historico ?? [];
    if (!ordem.clienteResposta) return base;
    const entrada = {
      tipo: "observacao" as const,
      texto:
        RESPOSTA_TEXTO[ordem.clienteResposta.tipo] +
        (ordem.clienteResposta.mensagem ? `\n"${ordem.clienteResposta.mensagem}"` : ""),
      autor: ordem.clienteNome,
      criadoEm: ordem.clienteResposta.criadoEm,
    };
    return [...base, entrada].sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
  })();

  const valorOrcamento = ordem.orcamento?.total ?? ordem.valorOrcamento ?? 0;
  const totalPago = ordem.pagamento?.totalPago ?? 0;
  const saldoPendente = Math.max(0, valorOrcamento - totalPago);

  return (
    <AppShell title={formatOsNumero(ordem.numero)}>
      <div className="max-w-3xl space-y-6">
        {status === "Concluída" && ordem.dataConclusao && (
          <p className="rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#16A34A]">
            OS encerrada em {formatDate(ordem.dataConclusao)}.
          </p>
        )}
        {status === "Cancelada" && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
            OS cancelada. Motivo: {ordem.motivoCancelamento}
          </p>
        )}
        {actionError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{actionError}</p>
        )}

        {/* Header da OS */}
        <section className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{formatOsNumero(ordem.numero)}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Aberta em {formatDate(ordem.dataAbertura)}
                {ordem.prazoPrevisto && ` · Prazo: ${formatDate(ordem.prazoPrevisto)}`}
              </p>
            </div>
            <Badge label={status} variant={getStatusVariant(status)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {permissions.canAdvance && next && next !== "Orçamento Enviado" && next !== "Concluída" && (
              <Button onClick={() => handleAdvance(next)}>
                Avançar para {next}
              </Button>
            )}
            {permissions.canAdvance && next === "Orçamento Enviado" && (
              <Button onClick={() => navigate(`/ordens/${ordem.id}/orcamento`)}>
                {ordem.orcamento ? "Editar Orçamento" : "Preparar Orçamento"}
              </Button>
            )}
            {permissions.canEdit && (
              <Button variant="ghost" onClick={() => navigate(`/ordens/${ordem.id}/editar`)}>
                Editar OS
              </Button>
            )}
            {permissions.canCancel && (
              <Button variant="destructive" onClick={() => setShowCancelModal(true)}>
                Cancelar OS
              </Button>
            )}
          </div>
        </section>

        {/* Card financeiro — "Pronto para Retirada" */}
        {status === "Pronto para Retirada" && isAdmin && (
          <section className="surface-card border-l-4 border-l-[#2563EB]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Recebimento
            </p>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Valor orçado</p>
                <p className="text-base font-bold text-slate-900">{formatCurrency(valorOrcamento)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Recebido</p>
                <p className="text-base font-bold text-[#16A34A]">{formatCurrency(totalPago)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Saldo</p>
                <p className={`text-base font-bold ${saldoPendente > 0 ? "text-[#F59E0B]" : "text-[#16A34A]"}`}>
                  {formatCurrency(saldoPendente)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowPaymentModal(true)}>
                Receber pagamento
              </Button>
              {pix && (
                <Button
                  variant="ghost"
                  onClick={handleCopyPix}
                >
                  {pixCopied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                  {pixCopied ? "Chave copiada!" : "Copiar chave PIX"}
                </Button>
              )}
              {nfEmissorUrl && !ordem.nfEmitida && (
                <Button variant="ghost" onClick={() => setShowNfModal(true)}>
                  <FileText size={14} className="mr-1.5" />
                  Emitir NF
                </Button>
              )}
              {ordem.nfEmitida && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-3 py-1.5 text-xs font-medium text-[#16A34A]">
                  <CheckSquare size={12} />
                  NF emitida{ordem.nfNumero ? ` — Nº ${ordem.nfNumero}` : ""}
                </span>
              )}
            </div>
          </section>
        )}

        {/* Card pós-pagamento — "Recebimento" */}
        {status === "Recebimento" && isAdmin && ordem.pagamento && (
          <section className="surface-card border-l-4 border-l-[#16A34A]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Pagamento registrado
            </p>
            <div className="rounded-xl bg-[#16A34A]/8 border border-[#16A34A]/20 px-4 py-3 mb-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600">Total recebido</span>
                <span className="text-xl font-bold text-[#16A34A]">
                  {formatCurrency(ordem.pagamento.totalPago)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {ordem.pagamento.formaPagamento} · {formatDate(ordem.pagamento.data)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={handleReciboPdf}
                loading={reciboPdfBusy}
              >
                <Download size={14} className="mr-1.5" />
                Gerar recibo PDF
              </Button>
              <Button variant="ghost" onClick={handleReciboWhatsApp}>
                <Phone size={14} className="mr-1.5" />
                Enviar via WhatsApp
              </Button>
              {nfEmissorUrl && !ordem.nfEmitida && (
                <Button variant="ghost" onClick={() => setShowNfModal(true)}>
                  <FileText size={14} className="mr-1.5" />
                  Emitir NF
                </Button>
              )}
              {nfEmissorUrl && ordem.nfEmitida && (
                <a
                  href={nfEmissorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-colors"
                >
                  <ExternalLink size={14} />
                  Ver NF {ordem.nfNumero ? `Nº ${ordem.nfNumero}` : "emitida"}
                </a>
              )}
              <Button onClick={handleFinalizarAtendimento}>
                Finalizar atendimento
              </Button>
            </div>
          </section>
        )}

        {/* Card "Entregue" — botão para concluir */}
        {status === "Entregue" && isAdmin && (
          <section className="surface-card border-l-4 border-l-[#16A34A]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Equipamento entregue
            </p>
            <p className="text-sm text-slate-600 mb-4">
              Confirme para encerrar a OS e registrar a garantia ({prazoGarantiaDias} dias).
            </p>
            <Button onClick={() => setShowConfirmAdvance(true)}>
              Concluir OS
            </Button>
          </section>
        )}

        {/* Dados do cliente e equipamento */}
        <section className="surface-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Cliente e Equipamento
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="text-sm text-slate-900">{ordem.clienteNome}</p>
            </div>
            {ordem.clienteTelefone && (
              <div>
                <p className="text-xs text-slate-500">Telefone</p>
                <a
                  href={`tel:${ordem.clienteTelefone}`}
                  className="flex items-center gap-1 text-sm text-[#2563EB]"
                >
                  <Phone size={14} />
                  {ordem.clienteTelefone}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Tipo</p>
              <p className="text-sm text-slate-900">{ordem.equipamentoTipo}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Marca / Modelo</p>
              <p className="text-sm text-slate-900">
                {ordem.equipamentoMarca} {ordem.equipamentoModelo}
              </p>
            </div>
            {ordem.equipamentoNumeroSerie && (
              <div>
                <p className="text-xs text-slate-500">Número de série</p>
                <p className="text-sm text-slate-900">{ordem.equipamentoNumeroSerie}</p>
              </div>
            )}
          </div>
        </section>

        {/* Serviço */}
        <section className="surface-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Serviço</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Defeito relatado</p>
              <p className="text-sm text-slate-900">{ordem.defeitoRelatado}</p>
            </div>
            {ordem.diagnostico && (
              <div>
                <p className="text-xs text-slate-500">Diagnóstico técnico</p>
                <p className="text-sm text-slate-900">{ordem.diagnostico}</p>
              </div>
            )}
            {isAdmin && ordem.orcamento && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500 mb-2">Orçamento</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                  {ordem.orcamento.descricaoServicos && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-slate-500">Serviços</p>
                      <p className="text-sm text-slate-900">{ordem.orcamento.descricaoServicos}</p>
                    </div>
                  )}
                  {ordem.orcamento.pecas.length > 0 && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-slate-500 mb-1">Peças</p>
                      {ordem.orcamento.pecas.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-700">{p.descricao}</span>
                          <span className="text-slate-900">{formatCurrency(p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-3 py-2 space-y-1">
                    {ordem.orcamento.maoDeObra > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Mão de obra</span>
                        <span className="text-slate-900">{formatCurrency(ordem.orcamento.maoDeObra)}</span>
                      </div>
                    )}
                    {ordem.orcamento.outrasDespesas > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Outras despesas</span>
                        <span className="text-slate-900">{formatCurrency(ordem.orcamento.outrasDespesas)}</span>
                      </div>
                    )}
                    {ordem.orcamento.desconto > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Desconto</span>
                        <span className="text-[#DC2626]">- {formatCurrency(ordem.orcamento.desconto)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-200">
                      <span className="text-slate-700">Total</span>
                      <span className="text-[#16A34A]">{formatCurrency(ordem.orcamento.total)}</span>
                    </div>
                  </div>
                  {(ordem.orcamento.prazoExecucao || ordem.orcamento.garantia) && (
                    <div className="px-3 py-2 flex gap-4">
                      {ordem.orcamento.prazoExecucao && (
                        <div>
                          <p className="text-xs text-slate-500">Prazo</p>
                          <p className="text-sm text-slate-900">{ordem.orcamento.prazoExecucao}</p>
                        </div>
                      )}
                      {ordem.orcamento.garantia && (
                        <div>
                          <p className="text-xs text-slate-500">Garantia</p>
                          <p className="text-sm text-slate-900">{ordem.orcamento.garantia}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {isAdmin && ordem.pagamento && (
              <div>
                <p className="text-xs text-slate-500">Pagamento</p>
                <p className="text-sm text-slate-900">
                  {formatCurrency(ordem.pagamento.totalPago)} — {ordem.pagamento.formaPagamento} em{" "}
                  {formatDate(ordem.pagamento.data)}
                </p>
              </div>
            )}
            {ordem.garantia && (
              <div>
                <p className="text-xs text-slate-500">Garantia válida até</p>
                <p className="text-sm text-slate-900">{formatDate(ordem.garantia.dataValidade)}</p>
              </div>
            )}
          </div>
        </section>

        <section className="surface-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Fotos</h3>
          <PhotosBlock
            empresaId={empresaId ?? ordem.empresaId}
            osId={ordem.id}
            fotos={ordem.fotos ?? []}
            canManage={permissions.canManagePhotos}
            isAdmin={isAdmin}
            onChange={handlePhotosChange}
          />
        </section>

        <section className="surface-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Observações
          </h3>
          <Timeline
            historico={historicoComResposta}
            canAddObservation={permissions.canAddObservation}
            onAddObservation={handleAddObservation}
          />
        </section>

        {ordem.clienteResposta && (
          <section className="surface-card">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Resposta do Cliente
            </h3>
            <div
              className={`rounded-lg border p-4 ${
                ordem.clienteResposta.tipo === "aprovado"
                  ? "border-[#16A34A]/40 bg-[#16A34A]/8"
                  : ordem.clienteResposta.tipo === "reprovado"
                    ? "border-[#DC2626]/40 bg-[#DC2626]/8"
                    : "border-[#2563EB]/40 bg-[#2563EB]/8"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  ordem.clienteResposta.tipo === "aprovado"
                    ? "text-[#16A34A]"
                    : ordem.clienteResposta.tipo === "reprovado"
                      ? "text-[#DC2626]"
                      : "text-[#2563EB]"
                }`}
              >
                {ordem.clienteResposta.tipo === "aprovado" && "Cliente aprovou o orçamento"}
                {ordem.clienteResposta.tipo === "reprovado" && "Cliente reprovou o orçamento"}
                {ordem.clienteResposta.tipo === "duvida" && "Cliente solicitou mais detalhes"}
              </p>
              {ordem.clienteResposta.mensagem && (
                <p className="mt-2 text-sm text-slate-700">{ordem.clienteResposta.mensagem}</p>
              )}
            </div>
          </section>
        )}

        {status === "Concluída" && (
          <section className="surface-card">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Documento da OS
            </h3>
            <OsPdfActions ordem={ordem} />
          </section>
        )}

        <section className="surface-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Link SmartTrack
          </h3>
          <SmartTrackLink token={ordem.token} clienteNome={ordem.clienteNome} />
        </section>

        <button
          type="button"
          onClick={() => navigate("/ordens")}
          className="text-sm text-slate-600 hover:underline"
        >
          ← Voltar para a lista
        </button>
      </div>

      {showCancelModal && (
        <CancelOsModal onClose={() => setShowCancelModal(false)} onConfirm={handleCancel} />
      )}
      {showPaymentModal && (
        <PaymentModal
          valorOrcamento={valorOrcamento}
          pix={pix}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handlePayment}
        />
      )}
      {showConfirmAdvance && status === "Entregue" && (
        <ConfirmModal
          title="Concluir OS"
          message={`Tem certeza? A OS será marcada como "Concluída" e a garantia será registrada por ${prazoGarantiaDias} dias.`}
          confirmLabel="Concluir"
          onClose={() => setShowConfirmAdvance(false)}
          onConfirm={async () => {
            await handleConcluir();
            setShowConfirmAdvance(false);
          }}
        />
      )}
      {showNfModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Emitir Nota Fiscal</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-700">
                Número da NF (opcional)
              </label>
              <input
                type="text"
                value={nfNumeroInput}
                onChange={(e) => setNfNumeroInput(e.target.value)}
                placeholder="Ex: 000123"
                className="h-9.5 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </div>
            {nfEmissorUrl && (
              <a
                href={nfEmissorUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline"
              >
                <ExternalLink size={14} />
                Abrir emissor de NF
              </a>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="ghost" onClick={() => setShowNfModal(false)} disabled={nfSaving} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleNfEmitida} loading={nfSaving} className="flex-1">
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
