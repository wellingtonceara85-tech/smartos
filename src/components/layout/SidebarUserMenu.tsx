import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, KeyRound, LogOut, Settings, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useEmpresa } from "../../contexts/EmpresaContext";
import { getDisplayNameFromEmail } from "../../lib/format";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  analista: "Analista",
};

interface SidebarUserMenuProps {
  onNavigate?: () => void;
}

export function SidebarUserMenu({ onNavigate }: SidebarUserMenuProps) {
  const { user } = useAuth();
  const { role } = useEmpresa();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { displayName, initial, rawName } = getDisplayNameFromEmail(user?.email);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={rootRef} className="relative shrink-0 border-t border-white/10 px-3 py-3">
      {open && (
        <div
          role="menu"
          className="animate-fade-in-up absolute right-3 bottom-full left-3 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A35] py-1.5 shadow-2xl shadow-black/40"
        >
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-slate-500"
          >
            <User size={15} />
            <span className="flex-1">Meu Perfil</span>
            <span className="text-[10px] text-slate-600">em breve</span>
          </button>
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-slate-500"
          >
            <KeyRound size={15} />
            <span className="flex-1">Alterar senha</span>
            <span className="text-[10px] text-slate-600">em breve</span>
          </button>
          {role === "admin" && (
            <Link
              to="/configuracoes"
              onClick={handleNavigate}
              role="menuitem"
              className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Settings size={15} />
              Configurações
            </Link>
          )}
          <div className="my-1 h-px bg-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut(auth)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-xs font-semibold text-white shadow-sm shadow-blue-500/30">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-white">
            {displayName || rawName || "Usuário"}
          </span>
          <span className="block truncate text-[11px] text-slate-400">{role ? ROLE_LABEL[role] : ""}</span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-slate-500" />
      </button>
    </div>
  );
}
