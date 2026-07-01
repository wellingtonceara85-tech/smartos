import { useEffect, useState, type ComponentType } from "react";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEmpresa } from "../../contexts/EmpresaContext";

type NavIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
}

interface NavModule {
  id: string;
  label: string;
  icon: NavIcon;
  items: NavItem[];
}

// Item isolado no topo do menu, fora de qualquer módulo — reflete o exemplo do usuário
// (🏠 Dashboard solto, depois módulos recolhíveis abaixo).
const STANDALONE_ITEM: NavItem = { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard };

// Novos módulos (Financeiro, Relatórios, Integrações, Aparência...) entram aqui como mais um
// objeto NavModule quando as telas correspondentes existirem — hoje só existem rotas reais para
// Atendimento e Administração, então não criamos itens que apontariam para páginas inexistentes.
const BASE_MODULES: NavModule[] = [
  {
    id: "atendimento",
    label: "Atendimento",
    icon: Wrench,
    items: [
      { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
      { to: "/clientes", label: "Clientes", icon: Users },
    ],
  },
];

const ADMIN_MODULE: NavModule = {
  id: "administracao",
  label: "Administração",
  icon: ShieldCheck,
  items: [
    { to: "/configuracoes", label: "Empresa", icon: Settings },
    { to: "/usuarios", label: "Usuários", icon: UserCog },
  ],
};

const STORAGE_KEY = "smartos:sidebar:collapsed-modules";

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage indisponível (ex. modo privado) — o recolhimento simplesmente não persiste.
  }
}

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const location = useLocation();
  const { role } = useEmpresa();
  const modules = role === "admin" ? [...BASE_MODULES, ADMIN_MODULE] : BASE_MODULES;

  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);

  // Garante que o módulo da rota atual nunca fique escondido atrás de um recolhimento salvo.
  useEffect(() => {
    const activeModule = modules.find((mod) => mod.items.some((item) => location.pathname.startsWith(item.to)));
    if (activeModule && collapsed.has(activeModule.id)) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(activeModule.id);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function toggleModule(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCollapsed(next);
      return next;
    });
  }

  function renderItem({ to, label, icon: Icon }: NavItem) {
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
    <nav className="relative flex-1 overflow-y-auto px-4 py-3">
      <div className="flex flex-col gap-1">{renderItem(STANDALONE_ITEM)}</div>

      {modules.map((mod) => {
        const isCollapsed = collapsed.has(mod.id);
        return (
          <div key={mod.id} className="mt-4">
            <button
              type="button"
              onClick={() => toggleModule(mod.id)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase transition-colors hover:text-slate-300"
            >
              <mod.icon size={13} className="text-slate-500" />
              <span className="flex-1">{mod.label}</span>
              <ChevronDown
                size={14}
                className={`text-slate-600 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
              />
            </button>
            <div
              className={`grid overflow-hidden transition-all duration-200 ease-out ${
                isCollapsed ? "grid-rows-[0fr] opacity-0" : "mt-1 grid-rows-[1fr] opacity-100"
              }`}
            >
              <div className="flex min-h-0 flex-col gap-1">{mod.items.map((item) => renderItem(item))}</div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
