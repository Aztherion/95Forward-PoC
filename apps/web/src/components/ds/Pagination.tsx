import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, pageSize, total, buildHref }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const hasPrev = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav className="f95-pagination" aria-label="Pagination">
      <span className="f95-pagination__info">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="f95-pagination__controls">
        <Link
          href={buildHref(current - 1)}
          className="f95-pagination__btn"
          aria-disabled={!hasPrev}
          tabIndex={hasPrev ? undefined : -1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} strokeWidth={1.8} /> Previous
        </Link>
        <span className="f95-pagination__info">
          Page {current} of {totalPages}
        </span>
        <Link
          href={buildHref(current + 1)}
          className="f95-pagination__btn"
          aria-disabled={!hasNext}
          tabIndex={hasNext ? undefined : -1}
          aria-label="Next page"
        >
          Next <ChevronRight size={15} strokeWidth={1.8} />
        </Link>
      </div>
    </nav>
  );
}
