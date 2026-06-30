import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DataTable, type Column } from "../components/ui/DataTable";
import { useEmpresa } from "../contexts/EmpresaContext";
import { OS_STATUS_VARIANT } from "../lib/osStatus";
import { formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import type { Cliente } from "../types/cliente";
import type { OrdemServico } from "../types/ordemServico";

export function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresaId, role } = useEmpresa();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;

  useEffect(() => {
    if (!id || !empresaId) return;

    setLoading(true);
    setError(false);

    Promise.all([
      getDoc(doc(db, "clientes", id)),
      getDocs(
        query(
          collection(db, "ordens"),
          where("clienteId", "==", id),
          where("empresaId", "==", empresaId),
        ),
      ),
    ])
      .then(([clienteSnap, ordensSnap]) => {
        if (!clienteSnap.exists()) {
          setCliente(null);
          return;
        }
        const c = { id: clienteSnap.id, ...(clienteSnap.data() as Omit<Cliente, "id">) };
        setCliente(c);

        const list: OrdemServico[] = ordensSnap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<OrdemServico, "id">) }),
        );
        // mais recente primeiro (sort client-side para evitar índice composto)
        list.sort((a, b) => b.dataAbertura.toMillis() - a.dataAbertura.toMillis());
        setOrdens(list);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, empresaId]);

  if (loading) {
    return (
      <AppShell title="Detalhes do Cliente">
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Detalhes do Cliente">
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          Não foi possível carregar o cliente. Tente novamente.
        </p>
      </AppShell>
    );
  }

  if (!cliente || (empresaId && cliente.empresaId !== empresaId)) {
    return (
      <AppShell title="Detalhes do Cliente">
        <p className="text-sm text-slate-500">Cliente não encontrado.</p>
      </AppShell>
    );
  }

  const isAdmin = role === "admin";

  const colunas: Column<OrdemServico>[] = [
    {
      header: "Nº OS",
      render: (o) => (
        <span className="font-mono text-slate-900">{formatOsNumero(o.numero)}</span>
      ),
    },
    {
      header: "Equipamento",
      render: (o) => (
        <span className="text-slate-700">
          {o.equipamentoMarca} {o.equipamentoModelo}
        </span>
      ),
    },
    {
      header: "Status",
      render: (o) => <Badge label={o.status} variant={OS_STATUS_VARIANT[o.status]} />,
    },
    {
      header: "Abertura",
      render: (o) => <span className="text-slate-500">{formatDate(o.dataAbertura)}</span>,
    },
  ];

  return (
    <AppShell title={cliente.nome}>
      <div className="max-w-3xl space-y-6">
        {successMessage && (
          <p className="rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#16A34A]">
            {successMessage}
          </p>
        )}

        {/* Bloco 1 — Dados do Cliente */}
        <section className="surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">{cliente.nome}</h2>
            <div className="flex flex-wrap gap-2">
              {(isAdmin || role === "analista") && (
                <Button variant="ghost" onClick={() => navigate(`/clientes/${id}/editar`)}>
                  Editar Cliente
                </Button>
              )}
              <Button onClick={() => navigate("/ordens/nova", { state: { clienteId: id, clienteNome: cliente.nome } })}>
                Nova OS para este Cliente
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Telefone</p>
              <p className="text-sm text-slate-900">{cliente.telefone}</p>
            </div>
            {cliente.email && (
              <div>
                <p className="text-xs text-slate-500">E-mail</p>
                <p className="text-sm text-slate-900">{cliente.email}</p>
              </div>
            )}
            {cliente.cpfCnpj && (
              <div>
                <p className="text-xs text-slate-500">CPF / CNPJ</p>
                <p className="text-sm text-slate-900">{cliente.cpfCnpj}</p>
              </div>
            )}
            {cliente.endereco && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Endereço</p>
                <p className="text-sm text-slate-900">{cliente.endereco}</p>
              </div>
            )}
            {cliente.observacoes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Observações</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{cliente.observacoes}</p>
              </div>
            )}
          </div>

        </section>

        {/* Bloco 2 — Histórico de OS */}
        <section className="surface-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Histórico de Ordens de Serviço
          </h3>
          {ordens.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma OS encontrada para este cliente.</p>
          ) : (
            <DataTable
              columns={colunas}
              rows={ordens}
              keyExtractor={(o) => o.id}
              onRowClick={(o) => navigate(`/ordens/${o.id}`)}
            />
          )}
        </section>

        <button
          type="button"
          onClick={() => navigate("/clientes")}
          className="text-sm text-slate-600 hover:underline"
        >
          ← Voltar para Clientes
        </button>
      </div>
    </AppShell>
  );
}
