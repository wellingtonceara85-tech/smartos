import { useState } from "react";
import { useParams } from "react-router-dom";
import { CircleDot } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useOrdemServicoByToken } from "../hooks/useOrdemServicoByToken";
import { Badge } from "../components/ui/Badge";
import { OS_STATUS_VARIANT } from "../lib/osStatus";
import { formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import type { ClienteRespostaTipo } from "../types/ordemServico";

const RESPOSTA_LABELS: Record<ClienteRespostaTipo, string> = {
  aprovado: "Orcamento aprovado pelo cliente",
  reprovado: "Orcamento reprovado pelo cliente",
  duvida: "Cliente solicitou mais detalhes",
};

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
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg)">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  if (notFound || !ordem) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-bg) px-4">
        <p className="text-center text-sm text-slate-500">Ordem de Servico nao encontrada.</p>
      </div>
    );
  }

  const statusHistorico = (ordem.historico ?? [])
    .filter((item) => item.tipo === "status")
    .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());

  const podeResponder =
    ordem.status === "Orçamento Enviado" && !ordem.clienteResposta && !enviado;

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

  const respostaExistente = ordem.clienteResposta ?? (enviado && respostaTipo ? { tipo: respostaTipo, mensagem: mensagem.trim() || undefined } : null);

  return (
    <div className="min-h-screen bg-(--color-bg) px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="flex flex-col items-center gap-3 text-center">
          {empresa?.logoUrl && (
            <img src={empresa.logoUrl} alt={empresa.nome} className="h-16 w-16 rounded-md object-contain" />
          )}
          <h1 className="text-lg font-bold text-slate-900">{empresa?.nome ?? "Assistencia Tecnica"}</h1>
          <p className="text-sm text-slate-500">{formatOsNumero(ordem.numero)}</p>
          <Badge label={ordem.status} variant={OS_STATUS_VARIANT[ordem.status]} />
        </header>

        <section className="surface-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Cliente e Equipamento
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        </section>

        {/* Resposta ao orçamento */}
        {(podeResponder || respostaExistente) && (
          <section className="surface-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Resposta ao Orcamento
            </h2>

            {respostaExistente ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  {RESPOSTA_LABELS[respostaExistente.tipo]}
                </p>
                {respostaExistente.mensagem && (
                  <p className="text-sm text-slate-600">{respostaExistente.mensagem}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Seu orcamento esta pronto. O que deseja fazer?
                </p>

                <div className="flex flex-col gap-2">
                  {(["aprovado", "reprovado", "duvida"] as ClienteRespostaTipo[]).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setRespostaTipo(tipo)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        respostaTipo === tipo
                          ? tipo === "aprovado"
                            ? "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]"
                            : tipo === "reprovado"
                              ? "border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]"
                              : "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {tipo === "aprovado" && "Aprovar orcamento"}
                      {tipo === "reprovado" && "Reprovar orcamento"}
                      {tipo === "duvida" && "Tenho duvidas / quero mais detalhes"}
                    </button>
                  ))}
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
                          : "Descreva sua duvida ou o que precisa saber..."
                    }
                    rows={3}
                    maxLength={400}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 resize-none"
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
                    className="w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {enviando ? "Enviando..." : "Confirmar resposta"}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <section className="surface-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Acompanhamento
          </h2>
          {statusHistorico.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma atualizacao registrada ainda.</p>
          ) : (
            <ul className="space-y-3 border-l-2 border-slate-200 pl-4">
              {statusHistorico.map((item, index) => (
                <li key={index} className="relative">
                  <span className="absolute -left-[21px] top-0.5 text-slate-400">
                    <CircleDot size={14} />
                  </span>
                  <p className="text-sm text-slate-700">{item.statusNovo ?? item.texto}</p>
                  <p className="text-xs text-slate-500">{item.criadoEm.toDate().toLocaleString("pt-BR")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {ordem.fotos && ordem.fotos.length > 0 && (
          <section className="surface-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Fotos</h2>
            <div className="grid grid-cols-3 gap-3">
              {ordem.fotos.map((foto) => (
                <img
                  key={foto.path}
                  src={foto.url}
                  alt="Foto da OS"
                  className="aspect-square w-full rounded-md border border-slate-200 object-cover"
                />
              ))}
            </div>
          </section>
        )}

        <section className="surface-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Datas</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        {ordem.garantia && (
          <section className="surface-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Garantia</h2>
            <p className="text-sm text-slate-900">Valida ate {formatDate(ordem.garantia.dataValidade)}</p>
            {empresa?.garantiaTexto && <p className="mt-2 text-sm text-slate-600">{empresa.garantiaTexto}</p>}
          </section>
        )}

        {empresa?.telefone && (
          <section className="surface-card text-center">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Contato</h2>
            <p className="text-sm text-slate-900">{empresa.telefone}</p>
            <a
              href={`https://wa.me/55${empresa.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-[#16A34A] hover:underline"
            >
              Falar no WhatsApp
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
