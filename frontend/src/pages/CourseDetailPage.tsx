/**
 * Course detail page: full description, aggregates, rating distribution,
 * recent feedback and the review form.
 *
 * After a successful submission the course is refetched, so the average, the
 * review count, the distribution and the feedback list all update together.
 */
import { Link, useParams } from "react-router-dom";

import { RatingDistribution } from "../components/RatingDistribution";
import { ReviewForm } from "../components/ReviewForm";
import { ReviewList } from "../components/ReviewList";
import { StarRating } from "../components/StarRating";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/States";
import { fetchCourse } from "../api/courses";
import { useApiResource } from "../hooks/useApiResource";
import { pluralise } from "../utils/format";

function DetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading course">
      <Skeleton className="h-4 w-48" />
      <div className="card space-y-4 p-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const id = Number(courseId);
  const course = useApiResource(() => fetchCourse(id), [id]);

  if (Number.isNaN(id)) {
    return <ErrorState title="Invalid course link" description="That course id is not a number." />;
  }

  if (course.loading) return <DetailSkeleton />;

  if (course.error) {
    return (
      <ErrorState
        title={course.error.isNotFound ? "Course not found" : "We could not load this course"}
        description={
          course.error.isNotFound ? (
            <>
              This course may have been removed.{" "}
              <Link to="/" className="font-semibold text-brand-700 underline">
                Browse all courses
              </Link>
            </>
          ) : (
            course.error.message
          )
        }
        onRetry={course.error.isNotFound ? undefined : course.reload}
      />
    );
  }

  if (!course.data) return null;
  const data = course.data;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link to="/" className="hover:text-brand-700 hover:underline">
          Courses
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-slate-900">{data.title}</span>
      </nav>

      <header className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-700 to-violet-600 px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-white/15 text-white">{data.category}</span>
            <span className="badge bg-white/15 text-white">⏱ {data.duration}</span>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-white sm:text-4xl">{data.title}</h1>
          <p className="mt-2 text-brand-50">
            Mentor: <span className="font-semibold text-white">{data.mentor}</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="rounded-xl bg-white/15 px-3 py-2">
              <StarRating rating={data.average_rating} reviewCount={data.review_count} />
            </span>
            <span className="text-sm text-brand-50">
              {data.review_count > 0
                ? `Based on ${pluralise(data.review_count, "published review")}`
                : "No published reviews yet"}
            </span>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-10">
          <h2 className="text-lg font-bold">About this course</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
            {data.description}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2" aria-labelledby="feedback-heading">
          <h2 id="feedback-heading" className="text-xl font-extrabold">
            Recent student feedback
          </h2>
          <ReviewList reviews={data.recent_reviews} />
        </section>

        <aside className="space-y-6">
          <section className="card p-6" aria-labelledby="distribution-heading">
            <h2 id="distribution-heading" className="text-lg font-bold">
              Rating breakdown
            </h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900">
                {data.average_rating > 0 ? data.average_rating.toFixed(1) : "-"}
              </span>
              <span className="text-sm text-slate-600">/ 5</span>
            </div>
            <div className="mt-1">
              <StarRating rating={data.average_rating} size="sm" showValue={false} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {pluralise(data.review_count, "review")}
            </p>
            <div className="mt-4">
              <RatingDistribution
                distribution={data.rating_distribution}
                totalReviews={data.review_count}
              />
            </div>
          </section>
        </aside>
      </div>

      <section aria-labelledby="review-form-heading">
        <h2 id="review-form-heading" className="mb-4 text-xl font-extrabold">
          Rate this course
        </h2>
        <ReviewForm courseId={data.id} onSubmitted={course.reload} />
      </section>
    </div>
  );
}
