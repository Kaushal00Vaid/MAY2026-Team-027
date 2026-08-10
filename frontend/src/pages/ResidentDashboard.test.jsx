// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResidentDashboard from "./ResidentDashboard";

const getResidentAnalytics = vi.fn();
const navigate = vi.fn();
const downloadStatement = vi.fn();
const saveBlob = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/api/analytics", () => ({
  getResidentAnalytics: (...args) => getResidentAnalytics(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { user_id: 7, first_name: "Ananya", last_name: "Shah", flat_number: "B-402" } }),
}));

vi.mock("@/features/finance/api", () => ({
  downloadStatement: (...args) => downloadStatement(...args),
  saveBlob: (...args) => saveBlob(...args),
  financeError: (_error, fallback) => fallback,
}));

vi.mock("@/features/security/useResidentPass", () => ({
  useResidentPass: () => ({ pass: { token: "signed-resident-token" }, loading: false, error: "", refresh: vi.fn() }),
}));

vi.mock("@/features/security/ResidentPassCode", () => ({
  default: ({ token }) => <div data-testid="resident-pass">{token}</div>,
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
    navigate.mockReset();
    downloadStatement.mockReset();
    saveBlob.mockReset();
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

  it("connects dashboard shortcuts to their resident workflows", async () => {
    getResidentAnalytics.mockResolvedValueOnce({
      data: {
        ...analyticsResponse.data,
        tickets: [{ id: "TKT-12", title: "Lift issue", type: "Maintenance", status: "Open", color: "blue" }],
        events: [{ id: 9, title: "AGM", location: "Hall", time_str: "18:00", month: "Aug", day: "20" }],
      },
    });

    render(<ResidentDashboard />);
    await screen.findByText("Welcome back, Ananya!");

    fireEvent.click(screen.getByRole("button", { name: /pay now/i }));
    expect(navigate).toHaveBeenLastCalledWith("/resident/finance", { state: { action: "pay" } });

    fireEvent.click(screen.getByRole("button", { name: /raise new ticket/i }));
    expect(navigate).toHaveBeenLastCalledWith("/resident/helpdesk", { state: { action: "new" } });

    fireEvent.click(screen.getByRole("button", { name: /lift issue/i }));
    expect(navigate).toHaveBeenLastCalledWith("/resident/helpdesk", { state: { ticketId: "12" } });

    fireEvent.click(screen.getByRole("button", { name: /rsvp \/ info/i }));
    expect(navigate).toHaveBeenLastCalledWith("/resident/community");

    fireEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(navigate).toHaveBeenLastCalledWith("/resident/community", { state: { view: "notices" } });

    expect(screen.getByTestId("resident-pass").textContent).toBe("signed-resident-token");
  });

  it("downloads the resident financial statement", async () => {
    getResidentAnalytics.mockResolvedValueOnce(analyticsResponse);
    downloadStatement.mockResolvedValueOnce({ data: new Blob(["statement"]) });

    render(<ResidentDashboard />);
    await screen.findByText("Welcome back, Ananya!");
    fireEvent.click(screen.getByRole("button", { name: /download financial statement/i }));

    await vi.waitFor(() => expect(saveBlob).toHaveBeenCalledWith(
      expect.any(Object),
      "societysync-statement.pdf",
    ));
  });
});
