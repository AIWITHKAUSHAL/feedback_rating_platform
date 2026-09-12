/** Admin dashboard: platform metrics, top rated course and the latest reviews. */
import { Link } from "react-router-dom";

import { fetchAdminReviews, fetchStats } from "../../api/admin";
import { StarRating } from "../../components/StarRating";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatCard } from "../../components/ui/StatCard";
import { ErrorState } from "../../components/ui/States";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate } from "../../utils/format";

const RECENT_REVIEW_COUNT = 5;

export function AdminDashboardPage() {
  const stats = useApiResource(fetchStats, []);
  const recent = useApiResource(() => fetchAdminReviews({ page_size: RECENT_REVIEW_COUNT }), []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform statistics are calculated from published (visible) reviews.
        </p>
      </div>

      {stats.loading && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading statistics">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      )}

      {stats.error && (
        <ErrorState
          title="Could not load statistics"
          description={stats.error.message}
          onRetry={stats.reload}
        />
      )}

      {stats.data && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total courses"
              value={stats.data.total_courses}
              hint={`${stats.data.total_categories} categories`}
              icon="📚"
            />
            <StatCard
              label="Total reviews"
              value={stats.data.total_reviews}
              hint={`${stats.data.visible_reviews} visible · ${stats.data.hidden_reviews} hidden`}
              icon="💬"
              tone="emerald"
            />
            <StatCard
              label="Average rating"
              value={
                stats.data.average_platform_rating > 0
                  ? stats.data.average_platform_rating.toFixed(2)
                  : "-"
              }
              hint="Across all visible reviews"
              icon="⭐"
              tone="amber"
            />
            <StatCard
              label="Top rated course"
              value={stats.data.top_rated_course?.title ?? "Not enough data"}
              hint={
                stats.data.top_rated_course
                  ? `${stats.data.top_rated_course.average_rating.toFixed(1)} from ${
                      stats.data.top_rated_course.review_count
                    } reviews`
                  : `Needs at least ${stats.data.min_reviews_for_top_rated} reviews to qualify`
              }
              icon="🏆"
              tone="slate"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card p-6 lg:col-span-1" aria-labelledby="moderation-heading">
              <h2 id="moderation-heading" className="text-lg font-bold">
                Moderation
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Visible reviews</dt>
                  <dd className="font-semibold text-emerald-700">{stats.data.visible_reviews}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600">Hidden reviews</dt>
                  <dd className="font-semibold text-amber-700">{stats.data.hidden_reviews}</dd>
                </div>
              </dl>
              <Link to="/admin/reviews" className="btn-secondary mt-5 w-full">
                Moderate reviews
              </Link>
            </section>

            <section className="card p-6 lg:col-span-2" aria-labelledby="recent-heading">
              <div className="flex items-center justify-between">
                <h2 id="recent-heading" className="text-lg font-bold">
                  Latest reviews
                </h2>
                <Link
                  to="/admin/reviews"
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  View all
                </Link>
              </div>

              {recent.loading && (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-16" />
                  ))}
                </div>
              )}

              {recent.error && (
                <p className="mt-4 text-sm text-rose-700" role="alert">
                  {recent.error.message}
                </p>
              )}

              {recent.data && recent.data.items.length === 0 && (
                <p className="mt-4 text-sm text-slate-600">No reviews have been submitted yet.</p>
              )}

              {recent.data && recent.data.items.length > 0 && (
                <ul className="mt-4 divide-y divide-slate-100">
                  {recent.data.items.map((review) => (
                    <li key={review.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {review.name}{" "}
                          <span className="font-normal text-slate-500">
                            on {review.course_title}
                          </span>
                        </p>
                        <div className="flex items-center gap-3">
                          <StarRating rating={review.rating} size="sm" showValue={false} />
                          {review.is_visible ? (
                            <span className="badge-success">Visible</span>
                          ) : (
                            <span className="badge-muted">Hidden</span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {review.review_text}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(review.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
