/** Admin dashboard rendering and review moderation actions. */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import * as adminApi from "../api/admin";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminReviewsPage } from "../pages/admin/AdminReviewsPage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { makeAdminReview, makePage, makePlatformStats, renderWithRouter } from "./helpers";

vi.mock("../api/admin");

const mockedApi = vi.mocked(adminApi);

beforeEach(() => {
  mockedApi.fetchStats.mockResolvedValue(makePlatformStats());
  mockedApi.fetchAdminReviews.mockResolvedValue(makePage([makeAdminReview()]));
});

describe("AdminDashboardPage", () => {
  it("shows a loading state while statistics load", () => {
    renderWithRouter(<AdminDashboardPage />);

    expect(screen.getByRole("status", { name: /loading statistics/i })).toBeInTheDocument();
  });

  it("renders the metric cards", async () => {
    renderWithRouter(<AdminDashboardPage />);

    expect(await screen.findByText(/total courses/i)).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText(/total reviews/i)).toBeInTheDocument();
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText("4.12")).toBeInTheDocument();
  });

  it("shows visible and hidden review counts", async () => {
    renderWithRouter(<AdminDashboardPage />);

    expect(await screen.findByText(/97 visible · 4 hidden/)).toBeInTheDocument();
    expect(screen.getByText("97")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows the top rated course", async () => {
    renderWithRouter(<AdminDashboardPage />);

    expect(await screen.findByText(/top rated course/i)).toBeInTheDocument();
    expect(screen.getByText(/4.8 from 4 reviews/)).toBeInTheDocument();
  });

  it("explains when no course qualifies as top rated", async () => {
    mockedApi.fetchStats.mockResolvedValue(makePlatformStats({ top_rated_course: null }));

    renderWithRouter(<AdminDashboardPage />);

    expect(await screen.findByText(/not enough data/i)).toBeInTheDocument();
    expect(screen.getByText(/needs at least 3 reviews/i)).toBeInTheDocument();
  });

  it("lists the latest reviews", async () => {
    renderWithRouter(<AdminDashboardPage />);

    expect(await screen.findByText(/latest reviews/i)).toBeInTheDocument();
    expect(screen.getByText("Aditi Sharma")).toBeInTheDocument();
  });

  it("shows an error state when statistics cannot be loaded", async () => {
    mockedApi.fetchStats.mockRejectedValue(
      new ApiError("Your session has expired.", { code: "INVALID_TOKEN", status: 401 }),
    );

    renderWithRouter(<AdminDashboardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load statistics/i);
  });
});

describe("AdminReviewsPage moderation", () => {
  it("renders a review with a masked email and its visibility status", async () => {
    renderWithRouter(<AdminReviewsPage />);

    expect(await screen.findByText("ad**************@example.com", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/✓ Visible/)).toBeInTheDocument();
  });

  it("hides a review and refreshes the list", async () => {
    const user = userEvent.setup();
    mockedApi.setReviewVisibility.mockResolvedValue(makeAdminReview({ is_visible: false }));

    renderWithRouter(<AdminReviewsPage />);
    await user.click(await screen.findByRole("button", { name: /hide review/i }));

    await waitFor(() => expect(mockedApi.setReviewVisibility).toHaveBeenCalledWith(1, false));
    expect(await screen.findByRole("status")).toHaveTextContent(/review is now hidden/i);
    // The list is refetched so public aggregates and status stay in step.
    expect(mockedApi.fetchAdminReviews).toHaveBeenCalledTimes(2);
  });

  it("unhides a hidden review", async () => {
    const user = userEvent.setup();
    mockedApi.fetchAdminReviews.mockResolvedValue(
      makePage([makeAdminReview({ is_visible: false })]),
    );
    mockedApi.setReviewVisibility.mockResolvedValue(makeAdminReview({ is_visible: true }));

    renderWithRouter(<AdminReviewsPage />);
    await user.click(await screen.findByRole("button", { name: /unhide review/i }));

    await waitFor(() => expect(mockedApi.setReviewVisibility).toHaveBeenCalledWith(1, true));
    expect(await screen.findByRole("status")).toHaveTextContent(/now visible to students/i);
  });

  it("reports an error if the moderation request fails", async () => {
    const user = userEvent.setup();
    mockedApi.setReviewVisibility.mockRejectedValue(
      new ApiError("Review not found.", { code: "REVIEW_NOT_FOUND", status: 404 }),
    );

    renderWithRouter(<AdminReviewsPage />);
    await user.click(await screen.findByRole("button", { name: /hide review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/review not found/i);
  });

  it("filters by visibility", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminReviewsPage />);
    await screen.findByText("Aditi Sharma");

    await user.click(screen.getByRole("button", { name: "Hidden" }));

    await waitFor(() =>
      expect(mockedApi.fetchAdminReviews).toHaveBeenLastCalledWith(
        expect.objectContaining({ is_visible: false }),
      ),
    );
  });
});

describe("AdminLoginPage", () => {
  it("signs in and stores the session", async () => {
    const user = userEvent.setup();
    mockedApi.login.mockResolvedValue({
      access_token: "test-token",
      token_type: "bearer",
      expires_in: 3600,
    });
    mockedApi.fetchProfile.mockResolvedValue({
      id: 1,
      email: "admin@coursepulse.dev",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    });

    renderWithRouter(<AdminLoginPage />, { route: "/admin/login" });
    await user.type(screen.getByLabelText(/email/i), "admin@coursepulse.dev");
    await user.type(screen.getByLabelText(/password/i), "super-secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockedApi.login).toHaveBeenCalledWith("admin@coursepulse.dev", "super-secret"),
    );
  });

  it("shows the API error message when credentials are rejected", async () => {
    const user = userEvent.setup();
    mockedApi.login.mockRejectedValue(
      new ApiError("Invalid credentials.", { code: "AUTHENTICATION_FAILED", status: 401 }),
    );

    renderWithRouter(<AdminLoginPage />, { route: "/admin/login" });
    await user.type(screen.getByLabelText(/email/i), "admin@coursepulse.dev");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid credentials/i);
  });
});
