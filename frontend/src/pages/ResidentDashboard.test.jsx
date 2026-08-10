// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResidentDashboard from "./ResidentDashboard";

const getResidentAnalytics = vi.fn();

vi.mock("@/api/analytics", () => ({
  getResidentAnalytics: (...args) => getResidentAnalytics(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { first_name: "Ananya", last_name: "Shah" } }),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children, userName }) => (
    <div data-testid="dashboard-layout" data-user-name={userName}>
      {children}
    </div>
  ),
}));

const analyticsResponse = {
  data: {
    balance: { total_due: 0, next_due_date: null, latest_invoice_number: null },
    tickets: [],
    bookings: [],
    events: [],
    notices: [],
  },
};

describe("ResidentDashboard", () => {
  beforeEach(() => {
    getResidentAnalytics.mockReset();
  });

  afterEach(cleanup);

  it("loads the dashboard with the authenticated resident identity", async () => {
    getResidentAnalytics.mockResolvedValueOnce(analyticsResponse);

    render(<ResidentDashboard />);

    expect(screen.getByRole("status").textContent).toContain(
      "Loading your dashboard",
    );
    expect(await screen.findByText("Welcome back, Ananya!")).toBeTruthy();
    expect(screen.getByTestId("dashboard-layout").dataset.userName).toBe(
      "Ananya Shah",
    );
    expect(getResidentAnalytics).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error and retries the request", async () => {
    getResidentAnalytics
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(analyticsResponse);

    render(<ResidentDashboard />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to load dashboard",
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Welcome back, Ananya!")).toBeTruthy();
    expect(getResidentAnalytics).toHaveBeenCalledTimes(2);
  });
});
