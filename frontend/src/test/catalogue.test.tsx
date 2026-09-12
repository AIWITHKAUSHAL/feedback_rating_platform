/** Catalogue page: loading, success, empty, error and filter interaction. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import * as coursesApi from "../api/courses";
import { HomePage } from "../pages/HomePage";
import { makeCourseListItem, makePage, makePlatformSummary, renderWithRouter } from "./helpers";

vi.mock("../api/courses");

const mockedApi = vi.mocked(coursesApi);

beforeEach(() => {
  mockedApi.fetchPlatformSummary.mockResolvedValue(makePlatformSummary());
  mockedApi.fetchCategories.mockResolvedValue([
    { category: "Python", course_count: 2 },
    { category: "DevOps", course_count: 3 },
  ]);
  mockedApi.fetchCourses.mockResolvedValue(
    makePage([
      makeCourseListItem(),
      makeCourseListItem({
        id: 2,
        title: "Terraform Infrastructure as Code",
        category: "DevOps",
        mentor: "Arjun Kulkarni",
        average_rating: 4.2,
        review_count: 8,
      }),
    ]),
  );
});

describe("HomePage catalogue", () => {
  it("shows a loading state before the courses arrive", () => {
    renderWithRouter(<HomePage />);

    expect(screen.getByRole("status", { name: /loading courses/i })).toBeInTheDocument();
  });

  it("renders the course cards returned by the API", async () => {
    renderWithRouter(<HomePage />);

    expect(await screen.findByText("FastAPI Production APIs")).toBeInTheDocument();
    expect(screen.getByText("Terraform Infrastructure as Code")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("shows the hero counters from the statistics endpoint", async () => {
    renderWithRouter(<HomePage />);

    // "Courses" also appears in the navigation, so assert on the values and on
    // the labels that are unique to the hero.
    expect(await screen.findByText("17")).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("Student reviews")).toBeInTheDocument();
    expect(screen.getByText("4.1")).toBeInTheDocument();
    expect(screen.getByText("Average rating")).toBeInTheDocument();
  });

  it("renders a course rating and review count on the card", async () => {
    renderWithRouter(<HomePage />);

    await screen.findByText("FastAPI Production APIs");
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByText("4.5")).toBeInTheDocument();
    expect(within(cards[0]).getByText(/12 reviews/i)).toBeInTheDocument();
  });

  it("shows an empty state when no course matches", async () => {
    mockedApi.fetchCourses.mockResolvedValue(makePage([]));

    renderWithRouter(<HomePage />);

    expect(await screen.findByText(/no courses match your filters/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the API fails", async () => {
    mockedApi.fetchCourses.mockRejectedValue(
      new ApiError("The service is temporarily unavailable.", {
        code: "DATABASE_UNAVAILABLE",
        status: 503,
      }),
    );

    renderWithRouter(<HomePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load the catalogue/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retries the request when the user clicks Try again", async () => {
    const user = userEvent.setup();
    mockedApi.fetchCourses.mockRejectedValueOnce(
      new ApiError("Network trouble", { code: "NETWORK_ERROR", status: 0 }),
    );

    renderWithRouter(<HomePage />);
    await user.click(await screen.findByRole("button", { name: /try again/i }));

    expect(await screen.findByText("FastAPI Production APIs")).toBeInTheDocument();
  });

  it("requests the selected category from the API", async () => {
    const user = userEvent.setup();
    renderWithRouter(<HomePage />);
    await screen.findByText("FastAPI Production APIs");

    await user.selectOptions(screen.getByLabelText(/^category$/i), "DevOps");

    await waitFor(() =>
      expect(mockedApi.fetchCourses).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: "DevOps", page: 1 }),
      ),
    );
  });

  it("requests the selected minimum rating", async () => {
    const user = userEvent.setup();
    renderWithRouter(<HomePage />);
    await screen.findByText("FastAPI Production APIs");

    await user.click(screen.getByRole("button", { name: "4★ & up" }));

    await waitFor(() =>
      expect(mockedApi.fetchCourses).toHaveBeenLastCalledWith(
        expect.objectContaining({ min_rating: 4 }),
      ),
    );
  });

  it("debounces the search box before calling the API", async () => {
    const user = userEvent.setup();
    renderWithRouter(<HomePage />);
    await screen.findByText("FastAPI Production APIs");
    const callsBefore = mockedApi.fetchCourses.mock.calls.length;

    await user.type(screen.getByLabelText(/search courses/i), "terra");

    // Five keystrokes must not produce five requests.
    expect(mockedApi.fetchCourses.mock.calls.length).toBe(callsBefore);
    await waitFor(
      () =>
        expect(mockedApi.fetchCourses).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: "terra" }),
        ),
      { timeout: 2000 },
    );
  });

  it("applies a search term supplied in the URL", async () => {
    renderWithRouter(<HomePage />, { route: "/?search=terraform" });

    await waitFor(() =>
      expect(mockedApi.fetchCourses).toHaveBeenCalledWith(
        expect.objectContaining({ search: "terraform" }),
      ),
    );
  });

  it("shows pagination when there is more than one page", async () => {
    mockedApi.fetchCourses.mockResolvedValue(
      makePage([makeCourseListItem()], { total: 30, pages: 3, page: 1 }),
    );

    renderWithRouter(<HomePage />);

    expect(await screen.findByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });
});
