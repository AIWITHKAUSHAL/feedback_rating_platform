/** Home page hero with live platform counters from GET /api/stats. */
import { formatCount } from "../utils/format";
import type { PlatformSummary } from "../types";
import { Skeleton } from "./ui/Skeleton";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
      <p className="text-sm text-brand-100">{label}</p>
    </div>
  );
}

export function Hero({ summary, loading }: { summary: PlatformSummary | null; loading: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-14 text-white sm:px-12 sm:py-20">
      {/* Decorative glow - hidden from assistive technology. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative max-w-3xl">
        <span className="badge bg-white/15 text-white backdrop-blur">
          ⭐ Transparent student feedback
        </span>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight text-white sm:text-5xl">
          Learn better through better feedback
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-50 sm:text-lg">
          Discover courses, explore real student experiences, and help improve learning by sharing
          honest, transparent feedback.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {loading || summary === null ? (
            Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 bg-white/20" />
            ))
          ) : (
            <>
              <Stat value={formatCount(summary.total_courses)} label="Courses" />
              <Stat value={formatCount(summary.total_reviews)} label="Student reviews" />
              <Stat
                value={summary.average_rating > 0 ? summary.average_rating.toFixed(1) : "-"}
                label="Average rating"
              />
              <Stat value={formatCount(summary.total_categories)} label="Categories" />
            </>
          )}
        </dl>
      </div>
    </section>
  );
}
