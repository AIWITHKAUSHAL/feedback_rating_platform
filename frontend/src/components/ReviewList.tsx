/** Recent student feedback. Reviewer email addresses are never sent to the browser. */
import { formatDate, initials } from "../utils/format";
import type { ReviewPublic } from "../types";
import { StarRating } from "./StarRating";

export function ReviewList({ reviews }: { reviews: ReviewPublic[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-600">
        No feedback has been published for this course yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700"
              aria-hidden="true"
            >
              {initials(review.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{review.name}</p>
                <time className="text-xs text-slate-500" dateTime={review.created_at}>
                  {formatDate(review.created_at)}
                </time>
              </div>
              <div className="mt-1">
                <StarRating rating={review.rating} size="sm" showValue={false} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{review.review_text}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
