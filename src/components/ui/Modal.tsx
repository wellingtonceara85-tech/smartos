import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="animate-fade-in-up w-full max-w-[560px] rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
        <div className="mt-6 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}
