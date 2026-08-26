// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffDashboard from "@/pages/StaffDashboard";

const getStaffAnalytics = vi.fn();
const navigate = vi.fn();

vi.mock("@/api/analytics", () => ({ getStaffAnalytics: (...args) => getStaffAnalytics(...args) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { first_name: "Asha", last_name: "Patel" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children, userName }) => <div><span>{userName}</span>{children}</div> }));

const analytics = {
  gate_activity: { total_entries_today: 12, pending_approvals: 2 },
  roster: { checked_in_now: 3, active_staff_today: 5 },
  inventory: { total_items: 18, low_stock_items: 1 },
  events: [{ id: 7, title: "Independence Day", rsvp_count: 20, starts_at: "2026-08-15T04:00:00Z" }],
};

describe("StaffDashboard", () => {
  beforeEach(() => {
    getStaffAnalytics.mockReset().mockResolvedValue({ data: analytics });
    navigate.mockReset();
  });
  afterEach(cleanup);

  it("shows authenticated staff metrics", async () => {
    render(<StaffDashboard />);
    expect(await screen.findByText("Independence Day")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Asha Patel")).toBeTruthy();
  });

  it.each([
    ["Gate Activity", "/gate"],
    ["Roster Coverage", "/gate/roster"],
    ["Inventory Status", "/gate/inventory"],
    ["Event Prep", "/gate/operations"],
  ])("opens the %s workflow", async (label, destination) => {
    render(<StaffDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(label, "i") }));
    expect(navigate).toHaveBeenLastCalledWith(destination);
  });

  it("opens event preparation from an event", async () => {
    render(<StaffDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: /Independence Day/i }));
    expect(navigate).toHaveBeenLastCalledWith("/gate/operations");
  });

  it("refreshes dashboard metrics", async () => {
    render(<StaffDashboard />);
    await screen.findByText("Independence Day");
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => expect(getStaffAnalytics).toHaveBeenCalledTimes(2));
  });

  it("retries after a load failure", async () => {
    getStaffAnalytics.mockReset().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ data: analytics });
    render(<StaffDashboard />);
    expect((await screen.findByRole("alert")).textContent).toContain("Unable to load dashboard data");
    expect(screen.queryByRole("button", { name: /Gate Activity/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Independence Day")).toBeTruthy();
    expect(getStaffAnalytics).toHaveBeenCalledTimes(2);
  });

  it("formats event times in the society timezone", async () => {
    const formatter = vi.spyOn(Date.prototype, "toLocaleDateString");
    render(<StaffDashboard />);
    await screen.findByText("Independence Day");

    expect(formatter).toHaveBeenCalledWith("en-IN", expect.objectContaining({
      timeZone: "Asia/Kolkata",
    }));
    formatter.mockRestore();
  });

  it("does not render a participant avatar when an event has no RSVPs", async () => {
    getStaffAnalytics.mockResolvedValueOnce({
      data: { ...analytics, events: [{ ...analytics.events[0], rsvp_count: 0 }] },
    });
    render(<StaffDashboard />);
    await screen.findByText("Independence Day");

    expect(screen.queryByLabelText("Confirmed guest")).toBeNull();
    expect(screen.getByText("0 Confirmed Guests")).toBeTruthy();
  });
});
