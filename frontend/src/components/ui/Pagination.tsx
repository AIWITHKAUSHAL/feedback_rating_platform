/** Accessible page navigation for the catalogue and admin tables. */
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  label?: string;
}

export function Pagination({ page, pages, total, onChange, label = "results" }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-600" aria-live="polite">
        Page <span className="font-semibold text-slate-900">{page}</span> of {pages} ·{" "}
        {total} {label}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          ← Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          Next →
        </Button>
      </div>
    </nav>
  );
}
