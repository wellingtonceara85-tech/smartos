import { useParams } from "react-router-dom";
import { CircleDot } from "lucide-react";
import { useOrdemServicoByToken } from "../hooks/useOrdemServicoByToken";
import { Badge } from "../components/ui/Badge";
import { OS_STATUS_VARIANT } from "../lib/osStatus";
import { formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";

export function SmartTrackPublic() {
  const { token } = useParams<{ token: string }>();
  const { ordem, empresa, loading, notFound } = useOrdemServicoByToken(token);

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
        <p className="text-center text-sm text-slate-500">Ordem de Serviço não encontrada.</p>
      </div>
    );
  }

  const statusHistorico = (ordem.historico ?? [])
    .filter((item) => item.tipo === "status")
    .sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());

  return (
    <div className="min-h-screen bg-(--color-bg) px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="flex flex-col items-center gap-3 text-center">
          {empresa?.logoUrl && (
            <img src={empresa.logoUrl} alt={empresa.nome} className="h-16 w-16 rounded-md object-contain" />
          )}
          <h1 className="text-lg font-bold text-slate-900">{empresa?.nome ?? "Assistência Técnica"}</h1>
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

        <section className="surface-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Acompanhamento
          </h2>
          {statusHistorico.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma atualização registrada ainda.</p>
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
                <p className="text-xs text-slate-500">Conclusão</p>
                <p className="text-sm text-slate-900">{formatDate(ordem.dataConclusao)}</p>
              </div>
            )}
          </div>
        </section>

        {ordem.garantia && (
          <section className="surface-card">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Garantia</h2>
            <p className="text-sm text-slate-900">Válida até {formatDate(ordem.garantia.dataValidade)}</p>
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
