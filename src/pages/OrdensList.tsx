import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { useEmpresa } from "../contexts/EmpresaContext";
import { getStatusVariant, getStatusLabel } from "../lib/osStatus";
import { formatCurrency, formatDate } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import { isWithinPeriod, type PeriodFilter } from "../lib/period";
import type { OrdemServico } from "../types/ordemServico";

const PAGE_SIZE = 20;

function buildColumns(role: string | null): Column<OrdemServico>[] {
  const now = new Date();
  const cols: Column<OrdemServico>[] = [
    { header: "Nº OS", render: (os) => formatOsNumero(os.numero) },
    { header: "Cliente", render: (os) => os.clienteNome },
    {
      header: "Equipamento",
      render: (os) => `${os.equipamentoMarca} ${os.equipamentoModelo}`,
    },
    {
      header: "Status",
      render: (os) => <Badge label={getStatusLabel(os.status)} variant={getStatusVariant(os.status)} />,
    },
    { header: "Data de abertura", render: (os) => formatDate(os.dataAbertura) },
    {
      header: "Prazo previsto",
      render: (os) => {
        if (!os.prazoPrevisto) return "—";
        const overdue =
          os.status !== "Concluída" &&
          os.status !== "Cancelada" &&
          os.prazoPrevisto.toDate() < now;
        return (
          <span className={overdue ? "text-[#DC2626]" : ""}>{formatDate(os.prazoPrevisto)}</span>
        );
      },
    },
  ];
  if (role === "admin") {
    cols.push({
      header: "Valor",
      render: (os) => (os.pagamento ? formatCurrency(os.pagamento.valor) : "—"),
    });
  }
  return cols;
}

type StatusFilter = "todas" | "abertas" | "concluidas" | "canceladas";

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "abertas", label: "Abertas" },
  { key: "concluidas", label: "Concluídas" },
  { key: "canceladas", label: "Canceladas" },
];

function matchesStatusFilter(os: OrdemServico, filter: StatusFilter): boolean {
  if (filter === "todas") return true;
  if (filter === "concluidas") return os.status === "Concluída";
  if (filter === "canceladas") return os.status === "Cancelada";
  return os.status !== "Concluída" && os.status !== "Cancelada";
}

export function OrdensList() {
  const { role, empresaId, loading: empresaLoading } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(
    (location.state as { successMessage?: string } | null)?.successMessage ?? "",
  );
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [period, setPeriod] = useState<PeriodFilter>("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadOrdens = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(false);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "ordens"),
          where("empresaId", "==", empresaId),
          orderBy("updatedAt", "desc"),
          limit(200),
        ),
      );
      setOrdens(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<OrdemServico, "id">),
        })),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaLoading) return;
    loadOrdens();
  }, [loadOrdens, empresaLoading]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, period, search]);

  useEffect(() => {
    if (!successMessage) return;
    navigate(location.pathname, { replace: true });
    const timeout = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage, location.pathname, navigate]);

  const searchTerm = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const now = new Date();
    return ordens.filter((os) => {
      if (!matchesStatusFilter(os, statusFilter)) return false;
      if (!isWithinPeriod(os.dataAbertura, period, now)) return false;
      if (!searchTerm) return true;
      return (
        String(os.numero).includes(searchTerm) ||
        os.clienteNome.toLowerCase().includes(searchTerm) ||
        os.equipamentoModelo.toLowerCase().includes(searchTerm)
      );
    });
  }, [ordens, statusFilter, period, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppShell title="Ordens de Serviço">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              active={statusFilter === chip.key}
              onClick={() => setStatusFilter(chip.key)}
            />
          ))}
        </div>
        <Button onClick={() => navigate("/ordens/nova")}>Nova OS</Button>
      </div>

      {successMessage && (
        <p className="mb-4 rounded-md bg-[#16A34A]/10 px-4 py-3 text-sm text-[#16A34A]">
          {successMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <div className="w-full max-w-xs">
          <Input
            id="busca-os"
            label="Busca"
            placeholder="Nº OS, cliente ou modelo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="periodo" className="text-[13px] font-medium text-slate-700">
            Período
          </label>
          <select
            id="periodo"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition-all duration-150 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          >
            <option value="todos">Todos</option>
            <option value="hoje">Hoje</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
          </select>
        </div>
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
      ) : ordens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-12 text-center">
          <p className="mb-3 text-sm text-slate-500">Ainda não há OSs. Crie a primeira.</p>
          <Button onClick={() => navigate("/ordens/nova")}>Nova OS</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-12 text-center text-sm text-slate-500">
          Nenhuma OS encontrada para este filtro.
        </p>
      ) : (
        <>
          <DataTable
            columns={buildColumns(role)}
            rows={pageItems}
            onRowClick={(os) => navigate(`/ordens/${os.id}`)}
            keyExtractor={(os) => os.id}
          />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </AppShell>
  );
}
