/**
 * API response types.
 *
 * These mirror the Pydantic schemas in `backend/app/schemas`. Keeping them in
 * one place means a backend contract change surfaces as a TypeScript error
 * rather than a runtime surprise.
 */

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface CourseListItem {
  id: number;
  title: string;
  slug: string;
  mentor: string;
  category: string;
  duration: string;
  short_description: string;
  average_rating: number;
  review_count: number;
  created_at: string;
}

export interface RatingBucket {
  rating: number;
  count: number;
  percentage: number;
}

export interface ReviewPublic {
  id: number;
  name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  mentor: string;
  category: string;
  duration: string;
  description: string;
  average_rating: number;
  review_count: number;
  rating_distribution: RatingBucket[];
  recent_reviews: ReviewPublic[];
  created_at: string;
  updated_at: string;
}

export interface CategorySummary {
  category: string;
  course_count: number;
}

export interface PlatformSummary {
  total_courses: number;
  total_reviews: number;
  average_rating: number;
  total_categories: number;
}

export interface ReviewInput {
  name: string;
  email: string;
  rating: number;
  review_text: string;
}

export interface CourseInput {
  title: string;
  mentor: string;
  category: string;
  duration: string;
  description: string;
}

export interface AdminCourse extends CourseInput {
  id: number;
  slug: string;
  average_rating: number;
  review_count: number;
  hidden_review_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminReview {
  id: number;
  course_id: number;
  course_title: string;
  name: string;
  masked_email: string;
  rating: number;
  review_text: string;
  is_visible: boolean;
  created_at: string;
}

export interface TopRatedCourse {
  id: number;
  title: string;
  mentor: string;
  category: string;
  average_rating: number;
  review_count: number;
}

export interface PlatformStats {
  total_courses: number;
  total_reviews: number;
  visible_reviews: number;
  hidden_reviews: number;
  average_platform_rating: number;
  top_rated_course: TopRatedCourse | null;
  min_reviews_for_top_rated: number;
  total_categories: number;
}

export interface AdminProfile {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Field-level validation problem returned inside a 422 response. */
export interface FieldError {
  field: string;
  message: string;
}

export type SortOption =
  | "rating_desc"
  | "rating_asc"
  | "newest"
  | "most_reviewed"
  | "title_asc"
  | "title_desc";

export interface CourseQuery {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  min_rating?: number;
  sort?: SortOption;
}
