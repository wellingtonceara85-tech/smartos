import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, CircleDot, XCircle, HelpCircle } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useOrdemServicoByToken } from "../hooks/useOrdemServicoByToken";
import { Badge } from "../components/ui/Badge";
import { getStatusVariant, getStatusLabel } from "../lib/osStatus";
import { formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import { formatCurrency } from "../lib/format";
import type { ClienteRespostaTipo } from "../types/ordemServico";

export function SmartTrackPublic() {
  const { token } = useParams<{ token: string }>();
  const { ordem, empresa, loading, notFound } = useOrdemServicoByToken(token);

  const [respostaTipo, setRespostaTipo] = useState<ClienteRespostaTipo | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroResposta, setErroResposta] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  if (notFound || !ordem) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-sm text-slate-500">Ordem de Servico nao encontrada.</p>
      </div>
    );
  }

  const oc = ordem.orcamento;
  const podeResponder =
    ordem.status === "Orçamento Enviado" && !ordem.clienteResposta && !enviado;

  const respostaExistente =
    ordem.clienteResposta ??
    (enviado && respostaTipo
      ? { tipo: respostaTipo, mensagem: mensagem.trim() || undefined }
      : null);

  const statusHistorico = (ordem.historico ?? [])
    .filter((item) => item.tipo === "status")
    .sort((a, b) => a.criadoEm.toMillis() - b.criadoEm.toMillis());

  async function handleResponder() {
    if (!respostaTipo || !ordem) return;
    setEnviando(true);
    setErroResposta("");
    try {
      await updateDoc(doc(db, "ordens", ordem.id), {
        clienteResposta: {
          tipo: respostaTipo,
          mensagem: mensagem.trim() || null,
          criadoEm: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });
      setEnviado(true);
    } catch {
      setErroResposta("Nao foi possivel enviar sua resposta. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-5 flex items-center gap-4">
          {empresa?.logoUrl && (
            <img
              src={empresa.logoUrl}
              alt={empresa.nome}
              className="h-12 w-12 rounded-lg object-contain border border-slate-100"
            />
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900">{empresa?.nome ?? "Assistencia Tecnica"}</h1>
            <p className="text-sm text-slate-500">{formatOsNumero(ordem.numero)}</p>
          </div>
          <div className="ml-auto">
            <Badge label={getStatusLabel(ordem.status)} variant={getStatusVariant(ordem.status)} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Proposta comercial */}
        {oc && (
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Proposta Comercial</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {ordem.clienteNome} · {ordem.equipamentoMarca} {ordem.equipamentoModelo}
              </p>
            </div>

            {oc.descricaoServicos && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Servicos
                </p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{oc.descricaoServicos}</p>
              </div>
            )}

            {oc.pecas.length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Pecas e Materiais
                </p>
                <div className="space-y-1.5">
                  {oc.pecas.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-700">{p.descricao}</span>
                      <span className="text-slate-900 font-medium">{formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 py-4 border-b border-slate-100 space-y-2">
              {oc.maoDeObra > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mao de obra</span>
                  <span className="text-slate-900">{formatCurrency(oc.maoDeObra)}</span>
                </div>
              )}
              {oc.outrasDespesas > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Outras despesas</span>
                  <span className="text-slate-900">{formatCurrency(oc.outrasDespesas)}</span>
                </div>
              )}
              {oc.desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Desconto</span>
                  <span className="text-[#DC2626]">- {formatCurrency(oc.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-xl font-bold text-[#16A34A]">{formatCurrency(oc.total)}</span>
              </div>
            </div>

            {(oc.prazoExecucao || oc.garantia) && (
              <div className="px-5 py-4 border-b border-slate-100 flex gap-6">
                {oc.prazoExecucao && (
                  <div>
                    <p className="text-xs text-slate-500">Prazo de execucao</p>
                    <p className="text-sm font-medium text-slate-900">{oc.prazoExecucao}</p>
                  </div>
                )}
                {oc.garantia && (
                  <div>
                    <p className="text-xs text-slate-500">Garantia</p>
                    <p className="text-sm font-medium text-slate-900">{oc.garantia}</p>
                  </div>
                )}
              </div>
            )}

            {oc.observacoes && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Observacoes
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{oc.observacoes}</p>
              </div>
            )}

            {oc.fotos && oc.fotos.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Fotos</p>
                <div className="grid grid-cols-3 gap-2">
                  {oc.fotos.map((foto) => (
                    <img
                      key={foto.path}
                      src={foto.url}
                      alt="Foto"
                      className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Resposta ao orcamento */}
        {(podeResponder || respostaExistente) && (
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Resposta ao Orcamento
              </h2>
            </div>

            <div className="px-5 py-4">
              {respostaExistente ? (
                <RespostaBadge tipo={respostaExistente.tipo} mensagem={respostaExistente.mensagem} />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Analise a proposta acima e nos informe sua decisao:
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <RespostaButton
                      tipo="aprovado"
                      label="Aprovar"
                      icon={<CheckCircle2 size={18} />}
                      selected={respostaTipo === "aprovado"}
                      onClick={() => setRespostaTipo("aprovado")}
                    />
                    <RespostaButton
                      tipo="duvida"
                      label="Solicitar ajustes"
                      icon={<HelpCircle size={18} />}
                      selected={respostaTipo === "duvida"}
                      onClick={() => setRespostaTipo("duvida")}
                    />
                    <RespostaButton
                      tipo="reprovado"
                      label="Nao aprovar"
                      icon={<XCircle size={18} />}
                      selected={respostaTipo === "reprovado"}
                      onClick={() => setRespostaTipo("reprovado")}
                    />
                  </div>

                  {respostaTipo && (
                    <textarea
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      placeholder={
                        respostaTipo === "aprovado"
                          ? "Observacao adicional (opcional)..."
                          : respostaTipo === "reprovado"
                            ? "Motivo (opcional)..."
                            : "Descreva o que precisa ser ajustado..."
                      }
                      rows={3}
                      maxLength={400}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 resize-none"
                    />
                  )}

                  {erroResposta && (
                    <p className="text-sm text-[#DC2626]">{erroResposta}</p>
                  )}

                  {respostaTipo && (
                    <button
                      type="button"
                      onClick={handleResponder}
                      disabled={enviando}
                      className="w-full rounded-lg bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {enviando ? "Enviando..." : "Confirmar resposta"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Acompanhamento / timeline */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Acompanhamento</h2>
          </div>
          <div className="px-5 py-4">
            {statusHistorico.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma atualizacao ainda.</p>
            ) : (
              <ul className="space-y-4 border-l-2 border-slate-200 pl-4">
                {statusHistorico.map((item, index) => (
                  <li key={index} className="relative">
                    <span className="absolute -left-[21px] top-0.5 text-slate-400">
                      <CircleDot size={14} />
                    </span>
                    <p className="text-sm font-medium text-slate-900">{item.statusNovo ?? item.texto}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.criadoEm.toDate().toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Info cliente / equipamento */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Dados do Servico
            </h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="text-sm text-slate-900">{ordem.clienteNome}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Equipamento</p>
              <p className="text-sm text-slate-900">
                {ordem.equipamentoMarca} {ordem.equipamentoModelo}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Abertura</p>
              <p className="text-sm text-slate-900">{formatDate(ordem.dataAbertura)}</p>
            </div>
            {ordem.dataConclusao && (
              <div>
                <p className="text-xs text-slate-500">Conclusao</p>
                <p className="text-sm text-slate-900">{formatDate(ordem.dataConclusao)}</p>
              </div>
            )}
          </div>
        </section>

        {/* Garantia */}
        {ordem.garantia && (
          <section className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500">Garantia valida ate</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">
              {formatDate(ordem.garantia.dataValidade)}
            </p>
            {empresa?.garantiaTexto && (
              <p className="mt-2 text-sm text-slate-600">{empresa.garantiaTexto}</p>
            )}
          </section>
        )}

        {/* Contato */}
        {empresa?.telefone && (
          <section className="bg-white rounded-xl border border-slate-200 px-5 py-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Duvidas? Fale conosco</p>
            <p className="text-sm font-medium text-slate-900">{empresa.telefone}</p>
            <a
              href={`https://wa.me/55${empresa.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-[#16A34A] hover:underline"
            >
              Chamar no WhatsApp
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

function RespostaButton({
  tipo,
  label,
  icon,
  selected,
  onClick,
}: {
  tipo: ClienteRespostaTipo;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  const colors: Record<ClienteRespostaTipo, string> = {
    aprovado: "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]",
    reprovado: "border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]",
    duvida: "border-[#D97706] bg-[#D97706]/10 text-[#D97706]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 justify-center rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
        selected ? colors[tipo] : "border-slate-200 text-slate-600 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function RespostaBadge({
  tipo,
  mensagem,
}: {
  tipo: ClienteRespostaTipo;
  mensagem?: string;
}) {
  const map: Record<ClienteRespostaTipo, { label: string; cls: string }> = {
    aprovado: { label: "Orcamento aprovado", cls: "bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]" },
    reprovado: { label: "Orcamento nao aprovado", cls: "bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]" },
    duvida: { label: "Ajustes solicitados", cls: "bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]" },
  };
  const { label, cls } = map[tipo];
  return (
    <div className={`rounded-lg border px-4 py-3 space-y-1 ${cls}`}>
      <p className="text-sm font-semibold">{label}</p>
      {mensagem && <p className="text-sm opacity-80">{mensagem}</p>}
    </div>
  );
}
