import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, maxLength, value, className = "", ...props }, ref) => {
    const length = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
            {label}
          </label>
          {maxLength && (
            <span className="text-xs text-slate-400">
              {length}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={id}
          maxLength={maxLength}
          value={value}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          className={`min-h-24 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
              : "border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          } ${className}`}
          {...props}
        />
        {error && (
          <span id={`${id}-error`} className="text-xs text-[#DC2626]">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
