/**
 * Review moderation.
 *
 * Hiding a review immediately removes it from the public course page, the
 * public average and the public review count - the aggregates are computed
 * from visible reviews on every read.
 */
import { useState } from "react";

import { fetchAdminReviews, setReviewVisibility } from "../../api/admin";
import { asApiError } from "../../api/client";
import { StarRating } from "../../components/StarRating";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { useApiResource } from "../../hooks/useApiResource";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDate } from "../../utils/format";

const PAGE_SIZE = 10;

type VisibilityFilter = "all" | "visible" | "hidden";

const FILTER_OPTIONS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

export function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<VisibilityFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reviews = useApiResource(
    () =>
      fetchAdminReviews({
        page,
        page_size: PAGE_SIZE,
        search,
        is_visible: filter === "all" ? undefined : filter === "visible",
      }),
    [page, search, filter],
  );

  async function toggleVisibility(reviewId: number, nextVisible: boolean) {
    setPendingId(reviewId);
    setActionError(null);
    setNotice(null);
    try {
      await setReviewVisibility(reviewId, nextVisible);
      setNotice(nextVisible ? "Review is now visible to students." : "Review is now hidden.");
      reviews.reload();
    } catch (caught) {
      setActionError(asApiError(caught).message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Review moderation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Hiding a review removes it from the public course page and from the course average
          straight away. Email addresses are partially masked.
        </p>
      </div>

      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="sr-only" htmlFor="admin-review-search">
            Search reviews
          </label>
          <input
            id="admin-review-search"
            type="search"
            className="field-input"
            placeholder="Search by student, course or review text..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter by visibility">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === option.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-brand-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}
      {actionError && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {reviews.loading && (
        <div className="space-y-3" role="status" aria-label="Loading reviews">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {reviews.error && (
        <ErrorState
          title="Could not load reviews"
          description={reviews.error.message}
          onRetry={reviews.reload}
        />
      )}

      {reviews.data && reviews.data.items.length === 0 && (
        <EmptyState
          title="No reviews match this filter"
          description="Try a different search term or switch the visibility filter."
        />
      )}

      {reviews.data && reviews.data.items.length > 0 && (
        <>
          <ul className="space-y-3">
            {reviews.data.items.map((review) => (
              <li key={review.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {review.name}{" "}
                      <span className="font-normal text-slate-500">· {review.masked_email}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      on <span className="font-medium">{review.course_title}</span> ·{" "}
                      <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StarRating rating={review.rating} size="sm" />
                    {/* Status uses text, not colour alone. */}
                    {review.is_visible ? (
                      <span className="badge-success">✓ Visible</span>
                    ) : (
                      <span className="badge-muted">🚫 Hidden</span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-700">{review.review_text}</p>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant={review.is_visible ? "secondary" : "primary"}
                    size="sm"
                    loading={pendingId === review.id}
                    onClick={() => toggleVisibility(review.id, !review.is_visible)}
                  >
                    {review.is_visible ? "Hide review" : "Unhide review"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={reviews.data.page}
            pages={reviews.data.pages}
            total={reviews.data.total}
            label="reviews"
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
