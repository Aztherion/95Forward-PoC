import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortKey?: string;
  align?: "left" | "right";
}

export interface DataTableSort {
  field: string;
  dir: "asc" | "desc";
  buildHref: (field: string, dir: "asc" | "desc") => string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  sort?: DataTableSort;
  caption?: string;
}

function SortableHeader({
  label,
  sortKey,
  sort,
}: {
  label: ReactNode;
  sortKey: string;
  sort: DataTableSort;
}) {
  const active = sort.field === sortKey;
  const nextDir: "asc" | "desc" = active && sort.dir === "asc" ? "desc" : "asc";
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <Link
      href={sort.buildHref(sortKey, nextDir)}
      className={`f95-table__sort${active ? " f95-table__sort--active" : ""}`}
      aria-label={`Sort by ${typeof label === "string" ? label : sortKey}`}
    >
      {label}
      <Icon size={13} strokeWidth={1.8} className="f95-table__sort-ic" />
    </Link>
  );
}

export function DataTable<T>({ columns, rows, rowKey, rowHref, sort, caption }: DataTableProps<T>) {
  return (
    <div className="f95-table-wrap">
      <table className="f95-table">
        {caption ? <caption className="f95-table__muted">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === "right" ? "f95-table__num" : undefined}
                aria-sort={
                  sort && col.sortKey === sort.field
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.sortKey && sort ? (
                  <SortableHeader label={col.header} sortKey={col.sortKey} sort={sort} />
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr key={rowKey(row)} className={href ? "f95-table__row--link" : undefined}>
                {columns.map((col, index) => {
                  const content = col.cell(row);
                  const cellCls = col.align === "right" ? "f95-table__num" : undefined;
                  if (href && index === 0) {
                    return (
                      <td key={col.key} className={cellCls}>
                        <Link href={href} className="f95-table__cell-link">
                          {content}
                        </Link>
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className={cellCls}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
