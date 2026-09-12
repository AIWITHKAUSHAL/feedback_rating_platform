/**
 * Student review form.
 *
 * Client-side validation gives fast feedback, but the backend re-validates
 * everything and owns the "one review per email per course" rule - a 409 from
 * the API is surfaced here as a clear, non-technical message.
 */
import { useState } from "react";

import { submitReview } from "../api/courses";
import { asApiError } from "../api/client";
import { hasErrors, REVIEW_TEXT_MAX, validateReview, type ValidationErrors } from "../utils/validation";
import type { ReviewInput } from "../types";
import { Button } from "./ui/Button";
import { TextAreaField, TextField } from "./ui/Field";
import { StarRatingInput } from "./StarRatingInput";

const EMPTY_FORM: ReviewInput = { name: "", email: "", rating: 0, review_text: "" };

interface ReviewFormProps {
  courseId: number;
  /** Called after a successful submission so the page can refresh its aggregates. */
  onSubmitted: () => void;
}

export function ReviewForm({ courseId, onSubmitted }: ReviewFormProps) {
  const [form, setForm] = useState<ReviewInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors<ReviewInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function update<K extends keyof ReviewInput>(field: K, value: ReviewInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    // Clear the field error as soon as the user starts fixing it.
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validateReview(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await submitReview(courseId, {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        review_text: form.review_text.trim(),
      });
      setForm(EMPTY_FORM);
      setErrors({});
      setSubmitted(true);
      onSubmitted();
    } catch (caught) {
      const error = asApiError(caught);
      if (error.isDuplicateReview) {
        setFormError(
          "You have already reviewed this course. Each email address can leave one review per course.",
        );
      } else if (error.fieldErrors.length > 0) {
        // Map server-side field errors onto the form.
        const mapped: ValidationErrors<ReviewInput> = {};
        for (const fieldError of error.fieldErrors) {
          mapped[fieldError.field as keyof ReviewInput] = fieldError.message;
        }
        setErrors(mapped);
        setFormError("Some of the values were rejected by the server.");
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card border-emerald-200 bg-emerald-50/50 p-6 text-center" role="status">
        <span className="text-3xl" aria-hidden="true">
          ✅
        </span>
        <h3 className="mt-2 text-lg font-bold text-emerald-900">Thank you for your feedback!</h3>
        <p className="mt-1 text-sm text-emerald-800">
          Your review is published and the course rating has been updated.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => setSubmitted(false)}>
          Write another review
        </Button>
      </div>
    );
  }

  return (
    <form className="card space-y-5 p-6" onSubmit={handleSubmit} noValidate>
      <div>
        <h3 className="text-lg font-bold">Share your experience</h3>
        <p className="mt-1 text-sm text-slate-600">
          One review per email address, per course. Your email is never shown publicly.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="review-name"
          label="Your name"
          required
          autoComplete="name"
          maxLength={120}
          value={form.name}
          error={errors.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Aditi Sharma"
        />
        <TextField
          id="review-email"
          label="Your email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          error={errors.email}
          hint="Used only to prevent duplicate reviews."
          onChange={(event) => update("email", event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <StarRatingInput
        value={form.rating}
        error={errors.rating}
        disabled={submitting}
        onChange={(rating) => update("rating", rating)}
      />

      <TextAreaField
        id="review-text"
        label="Your review"
        required
        rows={5}
        maxLength={REVIEW_TEXT_MAX}
        value={form.review_text}
        error={errors.review_text}
        hint={`${form.review_text.trim().length}/${REVIEW_TEXT_MAX} characters`}
        onChange={(event) => update("review_text", event.target.value)}
        placeholder="What worked well? What could be better? Would you recommend this course?"
      />

      {formError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" loading={submitting}>
          {submitting ? "Submitting..." : "Submit review"}
        </Button>
      </div>
    </form>
  );
}
