import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "destructive";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "h-9 px-4 rounded-lg text-sm font-semibold transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[#2563EB] text-white shadow-sm shadow-blue-500/20 hover:bg-[#1D4ED8] hover:shadow-md hover:shadow-blue-500/25 hover:-translate-y-px",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
    destructive:
      "bg-[#DC2626] text-white shadow-sm shadow-red-500/20 hover:bg-[#B91C1C] hover:shadow-md hover:shadow-red-500/25 hover:-translate-y-px",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
