/** Admin course management: searchable table with create and edit dialogs. */
import { useState } from "react";

import { fetchAdminCourses } from "../../api/admin";
import { CourseFormDialog } from "../../components/CourseFormDialog";
import { StarRating } from "../../components/StarRating";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { useApiResource } from "../../hooks/useApiResource";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { AdminCourse } from "../../types";

const PAGE_SIZE = 10;

export function AdminCoursesPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const courses = useApiResource(
    () => fetchAdminCourses({ page, page_size: PAGE_SIZE, search }),
    [page, search],
  );

  const categories = [...new Set((courses.data?.items ?? []).map((course) => course.category))];

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(course: AdminCourse) {
    setEditing(course);
    setDialogOpen(true);
  }

  function handleSaved(course: AdminCourse) {
    setNotice(
      editing ? `"${course.title}" was updated.` : `"${course.title}" was created.`,
    );
    courses.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Courses</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and edit courses. Editing never affects existing student reviews.
          </p>
        </div>
        <Button onClick={openCreate}>+ Create course</Button>
      </div>

      {notice && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="card p-4">
        <label className="sr-only" htmlFor="admin-course-search">
          Search courses
        </label>
        <input
          id="admin-course-search"
          type="search"
          className="field-input"
          placeholder="Search by title, mentor or category..."
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {courses.loading && (
        <div className="space-y-3" role="status" aria-label="Loading courses">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      )}

      {courses.error && (
        <ErrorState
          title="Could not load courses"
          description={courses.error.message}
          onRetry={courses.reload}
        />
      )}

      {courses.data && courses.data.items.length === 0 && (
        <EmptyState
          title="No courses yet"
          description="Create your first course to start collecting student feedback."
          action={<Button onClick={openCreate}>+ Create course</Button>}
        />
      )}

      {courses.data && courses.data.items.length > 0 && (
        <>
          {/* Table on desktop, stacked cards on small screens. */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Courses with ratings and review counts</caption>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Course</th>
                  <th scope="col" className="px-5 py-3">Category</th>
                  <th scope="col" className="px-5 py-3">Duration</th>
                  <th scope="col" className="px-5 py-3">Rating</th>
                  <th scope="col" className="px-5 py-3">Reviews</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.data.items.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{course.title}</p>
                      <p className="text-xs text-slate-500">{course.mentor}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge-brand">{course.category}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{course.duration}</td>
                    <td className="px-5 py-3">
                      <StarRating rating={course.average_rating} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {course.review_count}
                      {course.hidden_review_count > 0 && (
                        <span className="ml-2 text-xs text-amber-700">
                          +{course.hidden_review_count} hidden
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(course)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {courses.data.items.map((course) => (
              <li key={course.id} className="card p-4">
                <p className="font-semibold text-slate-900">{course.title}</p>
                <p className="text-xs text-slate-500">{course.mentor}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="badge-brand">{course.category}</span>
                  <span className="badge-neutral">⏱ {course.duration}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <StarRating rating={course.average_rating} size="sm" />
                  <span className="text-xs text-slate-500">{course.review_count} reviews</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => openEdit(course)}
                >
                  Edit course
                </Button>
              </li>
            ))}
          </ul>

          <Pagination
            page={courses.data.page}
            pages={courses.data.pages}
            total={courses.data.total}
            label="courses"
            onChange={setPage}
          />
        </>
      )}

      <CourseFormDialog
        open={dialogOpen}
        course={editing}
        categories={categories}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
