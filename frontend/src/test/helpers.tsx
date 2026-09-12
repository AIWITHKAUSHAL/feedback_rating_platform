/**
 * Test helpers.
 *
 * Tests mock the API modules (`src/api/*`) rather than axios itself: that keeps
 * the setup small while still exercising components, hooks, routing and state.
 */
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

import { AuthProvider } from "../hooks/AuthProvider";
import type {
  AdminCourse,
  AdminReview,
  CourseDetail,
  CourseListItem,
  Page,
  PlatformStats,
  PlatformSummary,
} from "../types";

export function renderWithRouter(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

export function makePage<T>(items: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    items,
    page: 1,
    page_size: 12,
    total: items.length,
    pages: items.length === 0 ? 0 : 1,
    ...overrides,
  };
}

export function makeCourseListItem(overrides: Partial<CourseListItem> = {}): CourseListItem {
  return {
    id: 1,
    title: "FastAPI Production APIs",
    slug: "fastapi-production-apis",
    mentor: "Dr. Neha Verma",
    category: "Python",
    duration: "6 weeks",
    short_description: "Design, test and ship production FastAPI services.",
    average_rating: 4.5,
    review_count: 12,
    created_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

export function makeCourseDetail(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    id: 1,
    title: "FastAPI Production APIs",
    slug: "fastapi-production-apis",
    mentor: "Dr. Neha Verma",
    category: "Python",
    duration: "6 weeks",
    description: "A full description of the course that students read before enrolling.",
    average_rating: 4.5,
    review_count: 2,
    rating_distribution: [
      { rating: 5, count: 1, percentage: 50 },
      { rating: 4, count: 1, percentage: 50 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 1, count: 0, percentage: 0 },
    ],
    recent_reviews: [
      {
        id: 1,
        name: "Aditi Sharma",
        rating: 5,
        review_text: "Exceptional depth without losing clarity.",
        created_at: "2026-02-01T09:00:00Z",
      },
    ],
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

export function makePlatformSummary(overrides: Partial<PlatformSummary> = {}): PlatformSummary {
  return {
    total_courses: 17,
    total_reviews: 101,
    average_rating: 4.1,
    total_categories: 9,
    ...overrides,
  };
}

export function makePlatformStats(overrides: Partial<PlatformStats> = {}): PlatformStats {
  return {
    total_courses: 17,
    total_reviews: 101,
    visible_reviews: 97,
    hidden_reviews: 4,
    average_platform_rating: 4.12,
    top_rated_course: {
      id: 1,
      title: "FastAPI Production APIs",
      mentor: "Dr. Neha Verma",
      category: "Python",
      average_rating: 4.75,
      review_count: 4,
    },
    min_reviews_for_top_rated: 3,
    total_categories: 9,
    ...overrides,
  };
}

export function makeAdminReview(overrides: Partial<AdminReview> = {}): AdminReview {
  return {
    id: 1,
    course_id: 1,
    course_title: "FastAPI Production APIs",
    name: "Aditi Sharma",
    masked_email: "ad**************@example.com",
    rating: 5,
    review_text: "Exceptional depth without losing clarity.",
    is_visible: true,
    created_at: "2026-02-01T09:00:00Z",
    ...overrides,
  };
}

export function makeAdminCourse(overrides: Partial<AdminCourse> = {}): AdminCourse {
  return {
    id: 1,
    title: "FastAPI Production APIs",
    slug: "fastapi-production-apis",
    mentor: "Dr. Neha Verma",
    category: "Python",
    duration: "6 weeks",
    description: "A full description of the course that students read before enrolling.",
    average_rating: 4.5,
    review_count: 12,
    hidden_review_count: 1,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}
