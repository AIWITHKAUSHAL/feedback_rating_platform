/**
 * Client-side validation.
 *
 * This exists to give instant, friendly feedback - it is NOT a security
 * boundary. The backend validates every field again with Pydantic and enforces
 * the duplicate-review rule in PostgreSQL.
 */
import type { CourseInput, ReviewInput } from "../types";

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

// Deliberately permissive: the authoritative check is the backend's
// email-validator, so we only catch obvious typos here.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 2000;

export function validateReview(input: ReviewInput): ValidationErrors<ReviewInput> {
  const errors: ValidationErrors<ReviewInput> = {};

  const name = input.name.trim();
  if (name.length < 2) errors.name = "Please enter your full name (at least 2 characters).";
  else if (name.length > 120) errors.name = "Name must be 120 characters or fewer.";

  const email = input.email.trim();
  if (email.length === 0) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (input.rating < 1 || input.rating > 5) errors.rating = "Select a rating from 1 to 5 stars.";

  const text = input.review_text.trim();
  if (text.length < REVIEW_TEXT_MIN) {
    errors.review_text = `Please write at least ${REVIEW_TEXT_MIN} characters.`;
  } else if (text.length > REVIEW_TEXT_MAX) {
    errors.review_text = `Reviews must be ${REVIEW_TEXT_MAX} characters or fewer.`;
  }

  return errors;
}

export function validateCourse(input: CourseInput): ValidationErrors<CourseInput> {
  const errors: ValidationErrors<CourseInput> = {};

  if (input.title.trim().length < 3) errors.title = "Title must be at least 3 characters.";
  if (input.mentor.trim().length < 2) errors.mentor = "Mentor name is required.";
  if (input.category.trim().length < 2) errors.category = "Category is required.";
  if (input.duration.trim().length < 2) errors.duration = "Duration is required (e.g. 6 weeks).";
  if (input.description.trim().length < 20) {
    errors.description = "Description must be at least 20 characters.";
  }

  return errors;
}

export function hasErrors<T>(errors: ValidationErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}
