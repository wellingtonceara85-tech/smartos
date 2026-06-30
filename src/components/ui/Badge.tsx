export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-[#16A34A]/10 text-[#15803D]",
  warning: "bg-[#D97706]/10 text-[#B45309]",
  error: "bg-[#DC2626]/10 text-[#B91C1C]",
  info: "bg-[#0284C7]/10 text-[#0369A1]",
  neutral: "bg-slate-100 text-slate-600",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-[#16A34A]",
  warning: "bg-[#D97706]",
  error: "bg-[#DC2626]",
  info: "bg-[#0284C7]",
  neutral: "bg-slate-400",
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-5.5 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide ${VARIANT_CLASSES[variant]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[variant]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
