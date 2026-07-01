import type { ReactNode } from "react";
import { useState } from "react";
import { Bell, Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getDisplayNameFromEmail } from "../../lib/format";
import { MobileDrawer } from "./MobileDrawer";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { displayName } = getDisplayNameFromEmail(user?.email);

  return (
    <div className="flex min-h-screen bg-(--color-bg)">
      <aside className="hidden w-64 shrink-0 md:sticky md:top-0 md:block md:h-screen">
        <Sidebar />
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
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
          <button
            type="button"
            aria-label="Notificações"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Bell size={18} />
          </button>
        </header>

        <main className="flex-1 px-6 py-7">{children}</main>
      </div>
    </div>
  );
}
