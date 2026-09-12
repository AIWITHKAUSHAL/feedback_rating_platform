/**
 * Catalogue controls: search, category, minimum rating and sort.
 *
 * Every control maps straight onto an API query parameter - filtering happens
 * in PostgreSQL, not in the browser.
 */
import type { CategorySummary, SortOption } from "../types";
import { Button } from "./ui/Button";

export interface FilterState {
  search: string;
  category: string;
  minRating: number;
  sort: SortOption;
}

interface CourseFiltersProps {
  filters: FilterState;
  categories: CategorySummary[];
  resultCount?: number;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

const SORT_LABELS: Array<{ value: SortOption; label: string }> = [
  { value: "rating_desc", label: "Highest rated" },
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "newest", label: "Newest" },
  { value: "title_asc", label: "Title (A-Z)" },
  { value: "rating_asc", label: "Lowest rated" },
];

const RATING_CHOICES = [0, 3, 4, 4.5];

export function CourseFilters({
  filters,
  categories,
  resultCount,
  onChange,
  onReset,
}: CourseFiltersProps) {
  const isFiltered =
    filters.search !== "" || filters.category !== "" || filters.minRating > 0;

  return (
    <section className="card p-5" aria-label="Course filters">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label className="field-label" htmlFor="course-search">
            Search courses
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              🔎
            </span>
            <input
              id="course-search"
              type="search"
              className="field-input pl-10"
              placeholder="Try 'terraform', 'python' or a mentor name"
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="course-category">
            Category
          </label>
          <select
            id="course-category"
            className="field-input"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.category} value={category.category}>
                {category.category} ({category.course_count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="course-sort">
            Sort by
          </label>
          <select
            id="course-sort"
            className="field-input"
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value as SortOption })}
          >
            {SORT_LABELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <span className="text-sm font-medium text-slate-700">Minimum rating:</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum rating">
          {RATING_CHOICES.map((rating) => {
            const active = filters.minRating === rating;
            return (
              <button
                key={rating}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ minRating: rating })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {rating === 0 ? "Any" : `${rating}★ & up`}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {resultCount !== undefined && (
            <p className="text-sm text-slate-600" aria-live="polite">
              <span className="font-semibold text-slate-900">{resultCount}</span> courses found
            </p>
          )}
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
