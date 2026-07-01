import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query, limit, where } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, Package, RefreshCw, Wallet } from "lucide-react";
import { db } from "../lib/firebase";
import { AppShell } from "../components/layout/AppShell";
import { KpiCard, KpiCardSkeleton } from "../components/dashboard/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useEmpresa } from "../contexts/EmpresaContext";
import { getStatusVariant, getStatusLabel } from "../lib/osStatus";
import { formatCurrency, formatDate, isSameDay, isSameMonth } from "../lib/format";
import { formatOsNumero } from "../lib/osNumero";
import type { OrdemServico } from "../types/ordemServico";

const OPEN_STATUSES = new Set(["Concluída", "Cancelada"]);

export function Dashboard() {
  const { role, empresaId, loading: empresaLoading } = useEmpresa();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const now = new Date();

  const abertas = ordens.filter((os) => !OPEN_STATUSES.has(os.status));
  const concluidasHoje = ordens.filter(
    (os) => os.status === "Concluída" && os.dataConclusao && isSameDay(os.dataConclusao, now),
  );
  const vencidas = abertas.filter(
    (os) => os.prazoPrevisto && os.prazoPrevisto.toDate() < now,
  );
  const receitaMes = ordens
    .filter((os) => os.pagamento && isSameMonth(os.pagamento.data, now))
    .reduce((total, os) => total + (os.pagamento?.valor ?? 0), 0);

  const recentes = ordens.slice(0, 10);

  return (
    <AppShell title="Dashboard">
      <div className="flex items-center justify-end pb-4">
        <Button variant="ghost" onClick={loadOrdens} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Atualizar
        </Button>
      </div>

      {!empresaLoading && !empresaId ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Sua conta ainda não está vinculada a uma empresa. Contate o administrador.
        </p>
      ) : error ? (
        <p className="rounded-md bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          Não foi possível carregar os dados. Tente novamente.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {loading ? (
              <>
                <KpiCardSkeleton />
                <KpiCardSkeleton />
                <KpiCardSkeleton />
                <KpiCardSkeleton />
              </>
            ) : (
              <>
                <KpiCard label="OSs Abertas" value={String(abertas.length)} icon={Package} color="blue" />
                <KpiCard
                  label="Concluídas Hoje"
                  value={String(concluidasHoje.length)}
                  icon={CheckCircle2}
                  color="green"
                />
                <KpiCard
                  label="Com Prazo Vencido"
                  value={String(vencidas.length)}
                  icon={AlertTriangle}
                  color="red"
                />
                <KpiCard
                  label="Receita do Mês"
                  value={formatCurrency(receitaMes)}
                  hidden={role !== "admin"}
                  icon={Wallet}
                  color="orange"
                />
              </>
            )}
          </div>

          {!loading && vencidas.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Prazo vencido</h2>
              <OrdensTable ordens={vencidas.slice(0, 5)} role={role} />
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">OSs recentes</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((key) => (
                  <div key={key} className="h-12 animate-pulse rounded-md bg-slate-200" />
                ))}
              </div>
            ) : recentes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center text-sm text-slate-500">
                Nenhuma OS aberta. Crie a primeira.
              </p>
            ) : (
              <OrdensTable ordens={recentes} role={role} />
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

function OrdensTable({ ordens, role }: { ordens: OrdemServico[]; role: "admin" | "analista" | null }) {
  const navigate = useNavigate();
  return (
    <div className="table-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100/80 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-5 py-3">Nº OS</th>
            <th className="px-5 py-3">Cliente</th>
            <th className="px-5 py-3">Equipamento</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Data de abertura</th>
            {role === "admin" && <th className="px-5 py-3">Valor</th>}
          </tr>
        </thead>
        <tbody>
          {ordens.map((os) => (
            <tr
              key={os.id}
              onClick={() => navigate(`/ordens/${os.id}`)}
              className="cursor-pointer border-t border-slate-100 transition-colors even:bg-slate-50/70 hover:bg-blue-50/80"
            >
              <td className="px-5 py-3.5 font-medium text-slate-700">{formatOsNumero(os.numero)}</td>
              <td className="px-5 py-3.5 text-slate-700">{os.clienteNome}</td>
              <td className="px-5 py-3.5 text-slate-700">
                {os.equipamentoMarca} {os.equipamentoModelo}
              </td>
              <td className="px-5 py-3.5">
                <Badge label={getStatusLabel(os.status)} variant={getStatusVariant(os.status)} />
              </td>
              <td className="px-5 py-3.5 text-slate-500">{formatDate(os.dataAbertura)}</td>
              {role === "admin" && (
                <td className="px-5 py-3.5 text-slate-700">
                  {os.pagamento ? formatCurrency(os.pagamento.valor) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
