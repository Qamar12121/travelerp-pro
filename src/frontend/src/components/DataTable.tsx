import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, ChevronsUpDown, SearchX } from "lucide-react";
import { useState } from "react";
import type { Column } from "../types";

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  keyField?: keyof T;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records found",
  emptyIcon,
  onRowClick,
  keyField = "id" as keyof T,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null || bv == null) return 0;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border/30"
      style={{ background: "oklch(0.11 0 0)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30">
            {columns.map((col) => (
              <th
                key={col.key as string}
                className={`px-4 py-3 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground whitespace-nowrap select-none ${
                  col.sortable
                    ? "cursor-pointer hover:text-foreground transition-smooth"
                    : ""
                }`}
                onClick={() => handleSort(col.key as string, col.sortable)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  handleSort(col.key as string, col.sortable)
                }
                tabIndex={col.sortable ? 0 : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-border">
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3 text-accent" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-accent" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
              <tr key={key} className="border-b border-border/20">
                {columns.map((col) => (
                  <td key={col.key as string} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-32 bg-muted/30" />
                  </td>
                ))}
              </tr>
            ))
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <div
                  className="flex flex-col items-center gap-3 text-muted-foreground"
                  data-ocid="table-empty-state"
                >
                  {emptyIcon ?? <SearchX className="w-8 h-8 opacity-40" />}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={String(row[keyField] ?? i)}
                className={`data-row ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => e.key === "Enter" && onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key as string}
                    className="px-4 py-3 text-foreground/90 whitespace-nowrap"
                  >
                    {col.render
                      ? col.render(row[col.key as keyof T] as unknown, row)
                      : String(row[col.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
