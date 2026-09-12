/** Course detail page: content, distribution, feedback and error handling. */
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

import { ApiError } from "../api/client";
import * as coursesApi from "../api/courses";
import { CourseDetailPage } from "../pages/CourseDetailPage";
import { makeCourseDetail, renderWithRouter } from "./helpers";

vi.mock("../api/courses");

const mockedApi = vi.mocked(coursesApi);

function renderDetail(courseId = 1) {
  return renderWithRouter(
    <Routes>
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
    </Routes>,
    { route: `/courses/${courseId}` },
  );
}

beforeEach(() => {
  mockedApi.fetchCourse.mockResolvedValue(makeCourseDetail());
});

describe("CourseDetailPage", () => {
  it("shows a loading placeholder first", () => {
    renderDetail();

    expect(screen.getByRole("status", { name: /loading course/i })).toBeInTheDocument();
  });

  it("renders the course details", async () => {
    renderDetail();

    expect(
      await screen.findByRole("heading", { level: 1, name: "FastAPI Production APIs" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dr. Neha Verma/)).toBeInTheDocument();
    expect(screen.getByText("6 weeks", { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText(/A full description of the course that students read/),
    ).toBeInTheDocument();
  });

  it("renders the average rating and review count", async () => {
    renderDetail();

    // The average appears twice: in the header badge and in the breakdown card.
    expect(await screen.findByText(/Based on 2 published reviews/)).toBeInTheDocument();
    expect(screen.getAllByText("4.5")).toHaveLength(2);
    expect(screen.getByText(/^2 reviews$/)).toBeInTheDocument();
  });

  it("renders the rating distribution with percentages", async () => {
    renderDetail();

    const table = await screen.findByRole("table");
    expect(table).toHaveTextContent("5 star");
    expect(table).toHaveTextContent("50%");
  });

  it("renders recent student feedback", async () => {
    renderDetail();

    expect(await screen.findByText("Aditi Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Exceptional depth without losing clarity/)).toBeInTheDocument();
  });

  it("shows a friendly empty message when there is no feedback", async () => {
    mockedApi.fetchCourse.mockResolvedValue(
      makeCourseDetail({ recent_reviews: [], review_count: 0, average_rating: 0 }),
    );

    renderDetail();

    expect(await screen.findByText(/no feedback has been published/i)).toBeInTheDocument();
    expect(screen.getByText(/no ratings yet/i)).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown course", async () => {
    mockedApi.fetchCourse.mockRejectedValue(
      new ApiError("Course not found.", { code: "COURSE_NOT_FOUND", status: 404 }),
    );

    renderDetail(9999);

    expect(await screen.findByRole("alert")).toHaveTextContent(/course not found/i);
    expect(screen.getByRole("link", { name: /browse all courses/i })).toBeInTheDocument();
  });

  it("offers a retry when loading fails for another reason", async () => {
    mockedApi.fetchCourse.mockRejectedValue(
      new ApiError("Network trouble", { code: "NETWORK_ERROR", status: 0 }),
    );

    renderDetail();

    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders the review form", async () => {
    renderDetail();

    expect(await screen.findByRole("heading", { name: /rate this course/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
  });
});
