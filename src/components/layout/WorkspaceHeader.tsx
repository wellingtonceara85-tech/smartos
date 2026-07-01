import { Building2 } from "lucide-react";
import { useEmpresa } from "../../contexts/EmpresaContext";
import { getInitials } from "../../lib/format";

export function WorkspaceHeader() {
  const { empresaNome, logoUrl, loading } = useEmpresa();
  const initials = getInitials(empresaNome);

  return (
    <div className="relative shrink-0 px-5 pt-5 pb-4">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`Logo ${empresaNome || "da empresa"}`}
            className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/5 object-contain p-1.5"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-sm font-semibold text-white">
            {initials || <Building2 size={18} />}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold leading-tight text-white">
            {loading ? "Carregando…" : empresaNome || "Minha Empresa"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">Plano Professional</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70"
            aria-hidden="true"
          />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-medium text-emerald-400/90">Licença Ativa</span>
      </div>

      <div className="mt-4 h-px bg-white/10" aria-hidden="true" />
    </div>
  );
}
