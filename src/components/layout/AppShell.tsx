import type { ReactNode } from "react";
import { useState } from "react";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useEmpresa } from "../../contexts/EmpresaContext";
import { MobileDrawer } from "./MobileDrawer";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/usuarios", label: "Usuários", icon: UserCog },
];

export function AppShell({ title, children }: AppShellProps) {
  const location = useLocation();
  const { role } = useEmpresa();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = role === "admin" ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : BASE_NAV_ITEMS;
  const rawName = user?.email?.split("@")[0] ?? "";
  const displayName = rawName
    .replace(/[0-9._-]+$/, "")
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const initial = (displayName || rawName).charAt(0).toUpperCase() || "U";

  function renderNavLink({ to, label, icon: Icon }: NavItem, onNavigate?: () => void) {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        key={to}
        to={to}
        onClick={onNavigate}
        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          active
            ? "bg-white/10 text-white shadow-inner"
            : "text-slate-300/90 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon
          size={18}
          strokeWidth={2}
          className={active ? "text-[#60A5FA]" : "text-slate-400 group-hover:text-slate-200"}
        />
        {label}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen bg-(--color-bg)">
      <aside className="relative hidden w-64 flex-col overflow-hidden bg-[#13132A] text-white md:flex">
        <div
          className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#2563EB]/25 blur-[90px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 -right-16 h-56 w-56 rounded-full bg-[#1D4ED8]/15 blur-[80px]"
          aria-hidden="true"
        />
        <div className="relative flex h-16 items-center gap-2 px-6 text-lg font-bold tracking-tight">
          <Sparkles size={20} className="text-[#60A5FA]" />
          SmartOS
        </div>
        <nav className="relative flex flex-col gap-1 px-4 py-2">
          {navItems.map((item) => renderNavLink(item))}
        </nav>
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav className="flex flex-col gap-1 px-4 py-3">
          {navItems.map((item) => renderNavLink(item, () => setDrawerOpen(false)))}
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300/90 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} className="text-slate-400" />
            Sair
          </button>
        </nav>
      </MobileDrawer>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/40 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-slate-900">{title}</h1>
              {displayName && <p className="text-xs text-slate-400">Bem-vindo, {displayName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notificações"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <Bell size={18} />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-xs font-semibold text-white shadow-sm shadow-blue-500/30">
                {initial}
              </span>
              <button
                type="button"
                onClick={() => signOut(auth)}
                aria-label="Sair"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
