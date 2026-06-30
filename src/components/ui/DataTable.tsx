import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({ columns, rows, onRowClick, keyExtractor }: DataTableProps<T>) {
  return (
    <div className="table-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100/80 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={`px-5 py-3 ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-t border-slate-100 transition-colors even:bg-slate-50/70 ${
                onRowClick ? "cursor-pointer hover:bg-blue-50/80" : ""
              }`}
            >
              {columns.map((col, i) => (
                <td key={i} className={`px-5 py-3.5 text-slate-700 ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
