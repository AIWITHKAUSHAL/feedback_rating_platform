/** Admin endpoints. Every call carries the bearer token via the client interceptor. */
import { apiClient } from "./client";
import type {
  AdminCourse,
  AdminProfile,
  AdminReview,
  CourseInput,
  Page,
  PlatformStats,
  TokenResponse,
} from "../types";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/admin/auth/login", {
    email,
    password,
  });
  return data;
}

export async function fetchProfile(): Promise<AdminProfile> {
  const { data } = await apiClient.get<AdminProfile>("/api/admin/auth/me");
  return data;
}

export async function fetchStats(): Promise<PlatformStats> {
  const { data } = await apiClient.get<PlatformStats>("/api/admin/stats");
  return data;
}

export interface AdminCourseQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

export async function fetchAdminCourses(
  query: AdminCourseQuery = {},
): Promise<Page<AdminCourse>> {
  const { data } = await apiClient.get<Page<AdminCourse>>("/api/admin/courses", {
    params: { page: query.page ?? 1, page_size: query.page_size ?? 20, search: query.search || undefined },
  });
  return data;
}

export async function createCourse(input: CourseInput): Promise<AdminCourse> {
  const { data } = await apiClient.post<AdminCourse>("/api/admin/courses", input);
  return data;
}

export async function updateCourse(courseId: number, input: CourseInput): Promise<AdminCourse> {
  const { data } = await apiClient.put<AdminCourse>(`/api/admin/courses/${courseId}`, input);
  return data;
}

export interface AdminReviewQuery {
  page?: number;
  page_size?: number;
  is_visible?: boolean;
  search?: string;
  course_id?: number;
}

export async function fetchAdminReviews(
  query: AdminReviewQuery = {},
): Promise<Page<AdminReview>> {
  const { data } = await apiClient.get<Page<AdminReview>>("/api/admin/reviews", {
    params: {
      page: query.page ?? 1,
      page_size: query.page_size ?? 20,
      is_visible: query.is_visible,
      search: query.search || undefined,
      course_id: query.course_id,
    },
  });
  return data;
}

export async function setReviewVisibility(
  reviewId: number,
  isVisible: boolean,
): Promise<AdminReview> {
  const { data } = await apiClient.patch<AdminReview>(
    `/api/admin/reviews/${reviewId}/visibility`,
    { is_visible: isVisible },
  );
  return data;
}
