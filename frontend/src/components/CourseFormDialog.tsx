/** Create / edit course dialog used by the admin course management page. */
import { useState } from "react";

import { createCourse, updateCourse } from "../api/admin";
import { asApiError } from "../api/client";
import {
  hasErrors,
  validateCourse,
  type ValidationErrors,
} from "../utils/validation";
import type { AdminCourse, CourseInput } from "../types";
import { Button } from "./ui/Button";
import { TextAreaField, TextField } from "./ui/Field";
import { Modal } from "./ui/Modal";

const EMPTY: CourseInput = {
  title: "",
  mentor: "",
  category: "",
  duration: "",
  description: "",
};

interface CourseFormDialogProps {
  open: boolean;
  /** null = create mode, a course = edit mode. */
  course: AdminCourse | null;
  categories: string[];
  onClose: () => void;
  onSaved: (course: AdminCourse) => void;
}

/**
 * The dialog shell. The form itself is keyed on the course being edited, so
 * React remounts it with fresh state instead of an effect copying props into
 * state.
 */
export function CourseFormDialog({
  open,
  course,
  categories,
  onClose,
  onSaved,
}: CourseFormDialogProps) {
  return (
    <Modal
      open={open}
      title={course ? `Edit: ${course.title}` : "Create course"}
      onClose={onClose}
    >
      <CourseForm
        key={course ? `course-${course.id}` : "new-course"}
        course={course}
        categories={categories}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function CourseForm({
  course,
  categories,
  onClose,
  onSaved,
}: Omit<CourseFormDialogProps, "open">) {
  const [form, setForm] = useState<CourseInput>(() =>
    course
      ? {
          title: course.title,
          mentor: course.mentor,
          category: course.category,
          duration: course.duration,
          description: course.description,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<ValidationErrors<CourseInput>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function update<K extends keyof CourseInput>(
    field: K,
    value: CourseInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validationErrors = validateCourse(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const saved = course
        ? await updateCourse(course.id, form)
        : await createCourse(form);
      onSaved(saved);
      onClose();
    } catch (caught) {
      const error = asApiError(caught);
      if (error.fieldErrors.length > 0) {
        const mapped: ValidationErrors<CourseInput> = {};
        for (const fieldError of error.fieldErrors) {
          mapped[fieldError.field as keyof CourseInput] = fieldError.message;
        }
        setErrors(mapped);
      }
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <TextField
        id="course-title"
        label="Title"
        required
        value={form.title}
        error={errors.title}
        maxLength={200}
        onChange={(event) => update("title", event.target.value)}
        placeholder="FastAPI Production APIs"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="course-mentor"
          label="Mentor"
          required
          value={form.mentor}
          error={errors.mentor}
          maxLength={120}
          onChange={(event) => update("mentor", event.target.value)}
          placeholder="Dr. Neha Verma"
        />
        <TextField
          id="course-duration"
          label="Duration"
          required
          value={form.duration}
          error={errors.duration}
          maxLength={60}
          onChange={(event) => update("duration", event.target.value)}
          placeholder="6 weeks"
        />
      </div>

      <TextField
        id="course-category"
        label="Category"
        required
        list="course-category-options"
        value={form.category}
        error={errors.category}
        maxLength={80}
        hint="Pick an existing category or type a new one."
        onChange={(event) => update("category", event.target.value)}
        placeholder="Python"
      />
      <datalist id="course-category-options">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <TextAreaField
        id="course-description"
        label="Description"
        required
        rows={5}
        maxLength={5000}
        value={form.description}
        error={errors.description}
        hint={`${form.description.trim().length} characters (minimum 20)`}
        onChange={(event) => update("description", event.target.value)}
        placeholder="What will students learn, and what will they be able to do afterwards?"
      />

      {formError && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
          role="alert"
        >
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {course ? "Save changes" : "Create course"}
        </Button>
      </div>
    </form>
  );
}
