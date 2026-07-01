import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { arrayUnion, doc, serverTimestamp, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { Phone } from "lucide-react";
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
import { getNextStatus, getOsPermissions } from "../lib/osFlow";
import { OS_STATUS_VARIANT } from "../lib/osStatus";
import { formatCurrency, formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import type { FotoOS } from "../types/ordemServico";

export function OrdemDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, empresaId, prazoGarantiaDias } = useEmpresa();
  const { ordem, loading, error, reload } = useOrdemServico(id);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmAdvance, setShowConfirmAdvance] = useState(false);
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
      if (next === "Concluída") extra.dataConclusao = Timestamp.now();
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
      const conclusaoTs = Timestamp.now();
      const validadeMs = conclusaoTs.toMillis() + prazoGarantiaDias * 24 * 60 * 60 * 1000;
      const dataFormatada = data.dataPagamento.toLocaleDateString("pt-BR");
      const linhasTexto = [
        `Pagamento registrado por ${autor}`,
        `Valor: ${formatCurrency(data.valor)}`,
        `Forma: ${data.formaPagamento}`,
        `Data: ${dataFormatada}`,
        ...(data.observacao ? [`Observação: ${data.observacao}`] : []),
      ];

      const batch = writeBatch(db);
      batch.update(doc(db, "ordens", ordem.id), {
        status: "Concluída",
        dataConclusao: conclusaoTs,
        updatedAt: serverTimestamp(),
        pagamento: {
          valor: data.valor,
          formaPagamento: data.formaPagamento,
          data: Timestamp.fromDate(data.dataPagamento),
        },
        garantia: {
          dataValidade: Timestamp.fromMillis(validadeMs),
        },
        historico: arrayUnion({
          tipo: "observacao",
          texto: linhasTexto.join("\n"),
          autor,
          criadoEm: conclusaoTs,
        }),
      });
      await batch.commit();
      setShowPaymentModal(false);
      await reload();
    } catch {
      setActionError("Não foi possível registrar o pagamento. Tente novamente.");
    }
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

  const permissions = getOsPermissions(ordem.status, role);
  const next = getNextStatus(ordem.status);
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
      texto: RESPOSTA_TEXTO[ordem.clienteResposta.tipo] +
        (ordem.clienteResposta.mensagem ? `\n"${ordem.clienteResposta.mensagem}"` : ""),
      autor: ordem.clienteNome,
      criadoEm: ordem.clienteResposta.criadoEm,
    };
    return [...base, entrada].sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());
  })();

  return (
    <AppShell title={formatOsNumero(ordem.numero)}>
      <div className="max-w-3xl space-y-6">
        {ordem.status === "Concluída" && ordem.dataConclusao && (
          <p className="rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#16A34A]">
            OS encerrada em {formatDate(ordem.dataConclusao)}.
          </p>
        )}
        {ordem.status === "Cancelada" && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
            OS cancelada. Motivo: {ordem.motivoCancelamento}
          </p>
        )}
        {actionError && (
          <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">{actionError}</p>
        )}

        <section className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{formatOsNumero(ordem.numero)}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Aberta em {formatDate(ordem.dataAbertura)}
                {ordem.prazoPrevisto && ` · Prazo: ${formatDate(ordem.prazoPrevisto)}`}
              </p>
            </div>
            <Badge label={ordem.status} variant={OS_STATUS_VARIANT[ordem.status]} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {permissions.canAdvance && next && next !== "Orçamento Enviado" && (
              <Button
                onClick={() => {
                  if (next === "Concluída") setShowConfirmAdvance(true);
                  else handleAdvance(next);
                }}
              >
                Avançar para {next}
              </Button>
            )}
            {permissions.canAdvance && next === "Orçamento Enviado" && (
              <Button onClick={() => navigate(`/ordens/${ordem.id}/orcamento`)}>
                {ordem.orcamento ? "Editar Orcamento" : "Preparar Orcamento"}
              </Button>
            )}
            {permissions.canRegisterPayment && (
              <Button onClick={() => setShowPaymentModal(true)}>Registrar Pagamento</Button>
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
                <p className="text-xs text-slate-500 mb-2">Orcamento</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                  {ordem.orcamento.descricaoServicos && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-slate-500">Servicos</p>
                      <p className="text-sm text-slate-900">{ordem.orcamento.descricaoServicos}</p>
                    </div>
                  )}
                  {ordem.orcamento.pecas.length > 0 && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-slate-500 mb-1">Pecas</p>
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
                        <span className="text-slate-500">Mao de obra</span>
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
                  {formatCurrency(ordem.pagamento.valor)} — {ordem.pagamento.formaPagamento} em{" "}
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
            <div className={`rounded-lg border p-4 ${
              ordem.clienteResposta.tipo === "aprovado"
                ? "border-[#16A34A]/40 bg-[#16A34A]/8"
                : ordem.clienteResposta.tipo === "reprovado"
                  ? "border-[#DC2626]/40 bg-[#DC2626]/8"
                  : "border-[#2563EB]/40 bg-[#2563EB]/8"
            }`}>
              <p className={`text-sm font-semibold ${
                ordem.clienteResposta.tipo === "aprovado"
                  ? "text-[#16A34A]"
                  : ordem.clienteResposta.tipo === "reprovado"
                    ? "text-[#DC2626]"
                    : "text-[#2563EB]"
              }`}>
                {ordem.clienteResposta.tipo === "aprovado" && "Cliente aprovou o orcamento"}
                {ordem.clienteResposta.tipo === "reprovado" && "Cliente reprovou o orcamento"}
                {ordem.clienteResposta.tipo === "duvida" && "Cliente solicitou mais detalhes"}
              </p>
              {ordem.clienteResposta.mensagem && (
                <p className="mt-2 text-sm text-slate-700">{ordem.clienteResposta.mensagem}</p>
              )}
            </div>
          </section>
        )}

        {ordem.status === "Concluída" && (
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

        <button type="button" onClick={() => navigate("/ordens")} className="text-sm text-slate-600 hover:underline">
          ← Voltar para a lista
        </button>
      </div>

      {showCancelModal && (
        <CancelOsModal onClose={() => setShowCancelModal(false)} onConfirm={handleCancel} />
      )}
      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} onConfirm={handlePayment} />
      )}
      {showConfirmAdvance && next && (
        <ConfirmModal
          title="Concluir OS"
          message={`Tem certeza? A OS será marcada como "${next}" e essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar"
          onClose={() => setShowConfirmAdvance(false)}
          onConfirm={async () => {
            await handleAdvance(next);
            setShowConfirmAdvance(false);
          }}
        />
      )}
    </AppShell>
  );
}
