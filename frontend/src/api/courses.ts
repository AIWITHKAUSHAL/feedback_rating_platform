/** Public course, review and statistics endpoints. */
import { apiClient } from "./client";
import type {
  CategorySummary,
  CourseDetail,
  CourseListItem,
  CourseQuery,
  Page,
  PlatformSummary,
  ReviewInput,
  ReviewPublic,
} from "../types";

/** Drop empty filters so the query string stays clean and cache friendly. */
function toParams(query: CourseQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (query.page) params.page = query.page;
  if (query.page_size) params.page_size = query.page_size;
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.category) params.category = query.category;
  if (query.min_rating) params.min_rating = query.min_rating;
  if (query.sort) params.sort = query.sort;
  return params;
}

export async function fetchCourses(query: CourseQuery = {}): Promise<Page<CourseListItem>> {
  const { data } = await apiClient.get<Page<CourseListItem>>("/api/courses", {
    params: toParams(query),
  });
  return data;
}

export async function fetchCourse(courseId: number): Promise<CourseDetail> {
  const { data } = await apiClient.get<CourseDetail>(`/api/courses/${courseId}`);
  return data;
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const { data } = await apiClient.get<CategorySummary[]>("/api/courses/categories");
  return data;
}

export async function fetchPlatformSummary(): Promise<PlatformSummary> {
  const { data } = await apiClient.get<PlatformSummary>("/api/stats");
  return data;
}

export async function submitReview(
  courseId: number,
  input: ReviewInput,
): Promise<ReviewPublic> {
  const { data } = await apiClient.post<ReviewPublic>(`/api/courses/${courseId}/reviews`, input);
  return data;
}
