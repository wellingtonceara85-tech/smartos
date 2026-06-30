import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, type = "text", id, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword && showPassword ? "text" : type;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={resolvedType}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-invalid={!!error}
            className={`h-9.5 w-full rounded-lg border px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 ${
              error
                ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                : "border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            } ${icon || isPassword ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {!isPassword && icon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
        </div>
        {error && (
          <span id={`${id}-error`} className="text-xs text-[#DC2626]">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
