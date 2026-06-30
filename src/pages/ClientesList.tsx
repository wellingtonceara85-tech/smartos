import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { useEmpresa } from "../contexts/EmpresaContext";
import { formatDate } from "../lib/format";
import type { Cliente } from "../types/cliente";
import type { OrdemServico } from "../types/ordemServico";

const PAGE_SIZE = 20;

interface ClienteRow extends Cliente {
  ossAbertas: number;
  ultimaOS: OrdemServico["dataAbertura"] | null;
}

const OPEN_STATUSES = new Set([
  "Aguardando Avaliação",
  "Em Avaliação",
  "Orçamento Enviado",
  "Orçamento Aprovado",
  "Em Reparo",
  "Aguardando Retirada",
]);

const COLUMNS: Column<ClienteRow>[] = [
  { header: "Nome", render: (c) => c.nome },
  { header: "Telefone", render: (c) => c.telefone },
  { header: "E-mail", render: (c) => c.email ?? "—" },
  {
    header: "OSs abertas",
    render: (c) =>
      c.ossAbertas > 0 ? (
        <span className="font-medium text-[#2563EB]">{c.ossAbertas}</span>
      ) : (
        <span className="text-slate-400">0</span>
      ),
  },
  {
    header: "Última OS",
    render: (c) => (c.ultimaOS ? formatDate(c.ultimaOS) : "—"),
  },
];

export function ClientesList() {
  const { empresaId, loading: empresaLoading } = useEmpresa();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(false);
    try {
      const [clientesSnap, ordensSnap] = await Promise.all([
        getDocs(
          query(collection(db, "clientes"), where("empresaId", "==", empresaId)),
        ),
        getDocs(
          query(collection(db, "ordens"), where("empresaId", "==", empresaId)),
        ),
      ]);

      const ordens = ordensSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<OrdemServico, "id">) }),
      );

      const ossAbertasPorCliente = new Map<string, number>();
      const ultimaOSPorCliente = new Map<string, OrdemServico["dataAbertura"]>();

      for (const os of ordens) {
        if (OPEN_STATUSES.has(os.status)) {
          ossAbertasPorCliente.set(
            os.clienteId,
            (ossAbertasPorCliente.get(os.clienteId) ?? 0) + 1,
          );
        }
        const current = ultimaOSPorCliente.get(os.clienteId);
        if (!current || os.dataAbertura.toMillis() > current.toMillis()) {
          ultimaOSPorCliente.set(os.clienteId, os.dataAbertura);
        }
      }

      const clientes: ClienteRow[] = clientesSnap.docs
        .map((d) => {
          const data = d.data() as Omit<Cliente, "id">;
          return {
            id: d.id,
            ...data,
            ossAbertas: ossAbertasPorCliente.get(d.id) ?? 0,
            ultimaOS: ultimaOSPorCliente.get(d.id) ?? null,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      setRows(clientes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaLoading) return;
    load();
  }, [load, empresaLoading]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    const digits = term.replace(/\D/g, "");
    return rows.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        c.telefone.includes(term) ||
        (digits.length > 0 &&
          (c.cpfCnpj ?? "").replace(/\D/g, "").includes(digits)),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppShell title="Clientes">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="w-full max-w-xs">
          <Input
            id="busca-cliente"
            label="Busca"
            placeholder="Nome, telefone ou CPF/CNPJ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => navigate("/clientes/novo")}>Novo Cliente</Button>
      </div>

      {!empresaLoading && !empresaId ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Sua conta ainda não está vinculada a uma empresa. Contate o administrador.
        </p>
      ) : error ? (
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          Não foi possível carregar os dados. Tente novamente.
        </p>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="h-12 animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-12 text-center">
          <p className="mb-3 text-sm text-slate-500">Nenhum cliente cadastrado. Crie o primeiro.</p>
          <Button onClick={() => navigate("/clientes/novo")}>Novo Cliente</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-12 text-center text-sm text-slate-500">
          Nenhum cliente encontrado para esta busca.
        </p>
      ) : (
        <>
          <DataTable
            columns={COLUMNS}
            rows={pageItems}
            onRowClick={(c) => navigate(`/clientes/${c.id}`)}
            keyExtractor={(c) => c.id}
          />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </AppShell>
  );
}
