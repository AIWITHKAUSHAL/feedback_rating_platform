/** One course in the catalogue grid. */
import { Link } from "react-router-dom";

import { pluralise } from "../utils/format";
import type { CourseListItem } from "../types";
import { StarRating } from "./StarRating";

export function CourseCard({ course }: { course: CourseListItem }) {
  return (
    <article className="card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="badge-brand">{course.category}</span>
        <span className="badge-neutral" title="Course duration">
          ⏱ {course.duration}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug">
        <Link
          to={`/courses/${course.id}`}
          className="transition group-hover:text-brand-700 hover:underline"
        >
          {course.title}
        </Link>
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        by <span className="font-medium text-slate-700">{course.mentor}</span>
      </p>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
        {course.short_description}
      </p>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
        <StarRating rating={course.average_rating} reviewCount={course.review_count} size="sm" />
        <span className="text-xs text-slate-500">
          {course.review_count > 0 ? pluralise(course.review_count, "review") : "No reviews yet"}
        </span>
      </div>

      <Link
        to={`/courses/${course.id}`}
        className="btn-secondary mt-4 w-full group-hover:border-brand-300 group-hover:text-brand-700"
      >
        View course
      </Link>
    </article>
  );
}
