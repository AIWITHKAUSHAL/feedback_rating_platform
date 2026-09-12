/** Metric tile used by the admin dashboard. */
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: "brand" | "emerald" | "amber" | "slate";
}

const TONE_CLASS = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
} as const;

export function StatCard({ label, value, hint, icon, tone = "brand" }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          {/* Wraps to a second line instead of truncating: the top-rated
              course title is the whole point of that card. */}
          <p className="mt-1 line-clamp-2 text-2xl font-bold leading-tight text-slate-900">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${TONE_CLASS[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
