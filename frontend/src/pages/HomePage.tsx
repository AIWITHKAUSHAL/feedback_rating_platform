/**
 * Course catalogue.
 *
 * Filters live in the URL, so a filtered view is shareable and the browser back
 * button behaves as users expect. Search input is debounced before it reaches
 * the URL (and therefore the API).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { CourseCard } from "../components/CourseCard";
import { CourseFilters, type FilterState } from "../components/CourseFilters";
import { Hero } from "../components/Hero";
import { Button } from "../components/ui/Button";
import { Pagination } from "../components/ui/Pagination";
import { CourseGridSkeleton } from "../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../components/ui/States";
import { fetchCategories, fetchCourses, fetchPlatformSummary } from "../api/courses";
import { useApiResource } from "../hooks/useApiResource";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { SortOption } from "../types";

const PAGE_SIZE = 12;
const DEFAULT_SORT: SortOption = "rating_desc";

export function HomePage() {
  const [params, setParams] = useSearchParams();

  const urlSearch = params.get("search") ?? "";
  const filters: FilterState = {
    search: urlSearch,
    category: params.get("category") ?? "",
    minRating: Number(params.get("min_rating") ?? 0),
    sort: (params.get("sort") as SortOption | null) ?? DEFAULT_SORT,
  };
  const page = Math.max(Number(params.get("page") ?? 1), 1);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput);
  // Tracks the value currently reflected in the URL so the two-way sync below
  // cannot loop.
  const committedSearch = useRef(urlSearch);

  const updateParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "" || value === 0) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Debounced typing -> URL.
  useEffect(() => {
    if (debouncedSearch === committedSearch.current) return;
    committedSearch.current = debouncedSearch;
    updateParams({ search: debouncedSearch, page: 1 });
  }, [debouncedSearch, updateParams]);

  // URL changed elsewhere (header search, "Top rated" link, back button) -> input.
  useEffect(() => {
    if (urlSearch !== committedSearch.current) {
      committedSearch.current = urlSearch;
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  const summary = useApiResource(fetchPlatformSummary, []);
  const categories = useApiResource(fetchCategories, []);
  const courses = useApiResource(
    () =>
      fetchCourses({
        page,
        page_size: PAGE_SIZE,
        search: filters.search,
        category: filters.category,
        min_rating: filters.minRating,
        sort: filters.sort,
      }),
    [page, filters.search, filters.category, filters.minRating, filters.sort],
  );

  function handleFilterChange(patch: Partial<FilterState>) {
    if (patch.search !== undefined) setSearchInput(patch.search);
    updateParams({
      category: patch.category,
      min_rating: patch.minRating,
      sort: patch.sort === DEFAULT_SORT ? undefined : patch.sort,
      page: 1,
    });
  }

  function handleReset() {
    setSearchInput("");
    committedSearch.current = "";
    setParams(new URLSearchParams(), { replace: true });
  }

  return (
    <div className="space-y-8">
      <Hero summary={summary.data} loading={summary.loading} />

      <section id="categories" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Explore courses</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search, filter by category and rating, then open a course to read student feedback.
            </p>
          </div>
        </div>

        <CourseFilters
          filters={{ ...filters, search: searchInput }}
          categories={categories.data ?? []}
          resultCount={courses.data?.total}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {courses.loading && <CourseGridSkeleton count={6} />}

        {!courses.loading && courses.error && (
          <ErrorState
            title="We could not load the catalogue"
            description={courses.error.message}
            onRetry={courses.reload}
          />
        )}

        {!courses.loading && !courses.error && courses.data && (
          <>
            {courses.data.items.length === 0 ? (
              <EmptyState
                title="No courses match your filters"
                description="Try a different search term, widen the minimum rating, or clear the filters to see everything."
                action={
                  <Button variant="secondary" onClick={handleReset}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {courses.data.items.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}

            <Pagination
              page={courses.data.page}
              pages={courses.data.pages}
              total={courses.data.total}
              label="courses"
              onChange={(nextPage) => updateParams({ page: nextPage })}
            />
          </>
        )}
      </section>
    </div>
  );
}
