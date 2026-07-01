import { WorkspaceHeader } from "./WorkspaceHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarUserMenu } from "./SidebarUserMenu";

interface SidebarProps {
  /** Chamado após navegar por um link — usado para fechar o drawer mobile. */
  onNavigate?: () => void;
}

/**
 * Workspace da empresa: usado como conteúdo da sidebar fixa (desktop) e do drawer (mobile),
 * para manter uma única fonte visual e evitar duplicação entre os dois breakpoints.
 */
export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#13132A] text-white">
      <div
        className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#2563EB]/25 blur-[90px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-[#1D4ED8]/15 blur-[80px]"
        aria-hidden="true"
      />

      <WorkspaceHeader />
      <SidebarNav onNavigate={onNavigate} />
      <SidebarUserMenu onNavigate={onNavigate} />
    </div>
  );
}
