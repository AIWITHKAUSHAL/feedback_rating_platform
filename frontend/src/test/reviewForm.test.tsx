/** Review form: validation, successful submission and duplicate handling. */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import * as coursesApi from "../api/courses";
import { ReviewForm } from "../components/ReviewForm";
import { renderWithRouter } from "./helpers";

vi.mock("../api/courses");

const mockedApi = vi.mocked(coursesApi);

const VALID = {
  name: "Aditi Sharma",
  email: "aditi@example.com",
  review: "The labs were genuinely useful and well paced.",
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), VALID.name);
  await user.type(screen.getByLabelText(/your email/i), VALID.email);
  await user.click(screen.getByRole("radio", { name: /5 stars/i }));
  await user.type(screen.getByLabelText(/your review/i), VALID.review);
}

beforeEach(() => {
  mockedApi.submitReview.mockResolvedValue({
    id: 10,
    name: VALID.name,
    rating: 5,
    review_text: VALID.review,
    created_at: "2026-03-01T12:00:00Z",
  });
});

describe("ReviewForm", () => {
  it("renders all required fields", () => {
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /rating out of 5/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/your review/i)).toBeInTheDocument();
  });

  it("blocks submission and reports validation errors when empty", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByText(/please enter your full name/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/select a rating from 1 to 5/i)).toBeInTheDocument();
    expect(mockedApi.submitReview).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address before calling the API", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await user.type(screen.getByLabelText(/your name/i), VALID.name);
    await user.type(screen.getByLabelText(/your email/i), "not-an-email");
    await user.click(screen.getByRole("radio", { name: /4 stars/i }));
    await user.type(screen.getByLabelText(/your review/i), VALID.review);
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockedApi.submitReview).not.toHaveBeenCalled();
  });

  it("rejects a review that is too short", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await user.type(screen.getByLabelText(/your name/i), VALID.name);
    await user.type(screen.getByLabelText(/your email/i), VALID.email);
    await user.click(screen.getByRole("radio", { name: /5 stars/i }));
    await user.type(screen.getByLabelText(/your review/i), "Good");
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();
  });

  it("marks invalid fields with aria-invalid for assistive technology", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByLabelText(/your name/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("submits a valid review and reports success", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    renderWithRouter(<ReviewForm courseId={7} onSubmitted={onSubmitted} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    await waitFor(() =>
      expect(mockedApi.submitReview).toHaveBeenCalledWith(7, {
        name: VALID.name,
        email: VALID.email,
        rating: 5,
        review_text: VALID.review,
      }),
    );
    expect(await screen.findByText(/thank you for your feedback/i)).toBeInTheDocument();
    // The parent refetches the course so the average and count update.
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it("shows the duplicate-review message when the API returns 409", async () => {
    const user = userEvent.setup();
    mockedApi.submitReview.mockRejectedValue(
      new ApiError("You have already reviewed this course.", {
        code: "DUPLICATE_REVIEW",
        status: 409,
      }),
    );
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already reviewed this course.*one review per course/i,
    );
  });

  it("maps server-side field errors back onto the form", async () => {
    const user = userEvent.setup();
    mockedApi.submitReview.mockRejectedValue(
      new ApiError("Some of the submitted values are invalid.", {
        code: "VALIDATION_ERROR",
        status: 422,
        fieldErrors: [{ field: "review_text", message: "Reviews must be shorter." }],
      }),
    );
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByText(/reviews must be shorter/i)).toBeInTheDocument();
  });

  it("shows a general error message when the request fails", async () => {
    const user = userEvent.setup();
    mockedApi.submitReview.mockRejectedValue(
      new ApiError("Could not reach the CoursePulse API.", {
        code: "NETWORK_ERROR",
        status: 0,
      }),
    );
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach/i);
  });

  it("prevents a double submit while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveRequest: (() => void) | undefined;
    mockedApi.submitReview.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = () =>
            resolve({
              id: 1,
              name: VALID.name,
              rating: 5,
              review_text: VALID.review,
              created_at: "2026-03-01T12:00:00Z",
            });
        }),
    );
    renderWithRouter(<ReviewForm courseId={1} onSubmitted={vi.fn()} />);

    await fillValidForm(user);
    const submit = screen.getByRole("button", { name: /submitting|submit review/i });
    await user.click(submit);

    expect(await screen.findByRole("button", { name: /submitting/i })).toBeDisabled();
    resolveRequest?.();
    await waitFor(() => expect(mockedApi.submitReview).toHaveBeenCalledTimes(1));
  });
});
