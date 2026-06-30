import type { LucideIcon } from "lucide-react";

export type KpiColor = "blue" | "green" | "orange" | "red";

const COLOR_CLASSES: Record<
  KpiColor,
  { bg: string; border: string; icon: string; shadow: string; value: string }
> = {
  blue: {
    bg: "from-[#DBEAFE] via-[#EBF3FF] to-[#F7FAFF]",
    border: "border-[#93C5FD]/60",
    icon: "bg-[#2563EB] text-white",
    shadow: "shadow-[0_10px_28px_-14px_rgba(37,99,235,0.55)]",
    value: "text-[#1E3A8A]",
  },
  green: {
    bg: "from-[#D1FAE5] via-[#E6FBF1] to-[#F5FDF9]",
    border: "border-[#6EE7B7]/60",
    icon: "bg-[#16A34A] text-white",
    shadow: "shadow-[0_10px_28px_-14px_rgba(22,163,74,0.5)]",
    value: "text-[#065F46]",
  },
  orange: {
    bg: "from-[#FFEDD5] via-[#FFF3E2] to-[#FFFAF3]",
    border: "border-[#FDBA74]/60",
    icon: "bg-[#D97706] text-white",
    shadow: "shadow-[0_10px_28px_-14px_rgba(217,119,6,0.5)]",
    value: "text-[#7C2D12]",
  },
  red: {
    bg: "from-[#FEE2E2] via-[#FFEAEA] to-[#FFF5F5]",
    border: "border-[#FCA5A5]/60",
    icon: "bg-[#DC2626] text-white",
    shadow: "shadow-[0_10px_28px_-14px_rgba(220,38,38,0.5)]",
    value: "text-[#7F1D1D]",
  },
};

interface KpiCardProps {
  label: string;
  value: string;
  hidden?: boolean;
  icon: LucideIcon;
  color: KpiColor;
}

export function KpiCard({ label, value, hidden = false, icon: Icon, color }: KpiCardProps) {
  const palette = COLOR_CLASSES[color];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200 hover:-translate-y-0.5 ${palette.bg} ${palette.border} ${palette.shadow}`}
    >
      <div className="relative flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>
          <Icon size={18} strokeWidth={2.25} />
        </span>
      </div>
      <p className={`relative mt-3 text-[30px] font-bold leading-none tracking-tight ${palette.value}`}>
        {hidden ? "—" : value}
      </p>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="mt-4 h-7 w-16 animate-pulse rounded bg-slate-200" />
    </div>
  );
}
