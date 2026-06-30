interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-sm text-slate-600">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 transition-colors disabled:opacity-50 hover:border-slate-300 hover:bg-slate-50"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 transition-colors disabled:opacity-50 hover:border-slate-300 hover:bg-slate-50"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
