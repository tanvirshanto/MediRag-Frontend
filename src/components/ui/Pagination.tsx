"use client";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.max(0, Math.min(page, totalPages - 1));
  const start = total === 0 ? 0 : clampedPage * pageSize + 1;
  const end = Math.min((clampedPage + 1) * pageSize, total);

  if (total === 0) return null;

  const buttonBase = "inline-flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-dim)] focus:ring-offset-1";
  const navButton = `${buttonBase} h-8 min-w-[32px] px-2 text-[var(--muted)] border border-[var(--border)] hover:border-[var(--accent-dim)] hover:text-[var(--accent-dim)] hover:bg-blue-50/50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)] disabled:hover:bg-transparent disabled:active:scale-100`;
  const pageButton = `${buttonBase} h-8 w-8 border transition-colors`;
  const pageActive = "bg-[var(--accent-dim)] text-white border-[var(--accent-dim)] shadow-sm shadow-blue-500/20 font-semibold";
  const pageInactive = "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent-dim)] hover:text-[var(--accent-dim)] hover:bg-blue-50/50 active:scale-95";

  const renderPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (clampedPage > 2) pages.push("ellipsis");

      const start = Math.max(1, clampedPage - 1);
      const end = Math.min(totalPages - 2, clampedPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (clampedPage < totalPages - 3) pages.push("ellipsis");
      pages.push(totalPages - 1);
    }

    return pages.map((p, idx) => {
      if (p === "ellipsis") {
        return (
          <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-[10px] text-[var(--muted)] select-none">
            …
          </span>
        );
      }
      return (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          disabled={p === clampedPage}
          className={`${pageButton} ${p === clampedPage ? pageActive : pageInactive}`}
        >
          {p + 1}
        </button>
      );
    });
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--muted)] whitespace-nowrap">Rows per page</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 pr-6 text-xs text-[var(--text)] outline-none transition focus:border-[var(--accent-dim)] focus:ring-1 focus:ring-[var(--accent-dim)] cursor-pointer appearance-none bg-[length:0.75rem] bg-[right_0.35rem_center] bg-no-repeat"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")` }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(0)}
          disabled={clampedPage === 0}
          className={navButton}
          title="First page"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(clampedPage - 1)}
          disabled={clampedPage === 0}
          className={navButton}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="hidden sm:flex sm:items-center sm:gap-1">
          {renderPageNumbers()}
        </div>
        <span className="flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--text)] sm:hidden">
          {clampedPage + 1} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(clampedPage + 1)}
          disabled={clampedPage >= totalPages - 1}
          className={navButton}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={clampedPage >= totalPages - 1}
          className={navButton}
          title="Last page"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <span className="text-xs text-[var(--muted)] whitespace-nowrap">
        {start}–{end} of {total}
      </span>
    </div>
  );
}
