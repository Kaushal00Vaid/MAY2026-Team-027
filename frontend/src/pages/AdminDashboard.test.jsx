// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const getAdminAnalytics = vi.fn();
const getTransactions = vi.fn();
const downloadAnalyticsExport = vi.fn();
const navigate = vi.fn();

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/api/analytics", () => ({
  getAdminAnalytics: (...args) => getAdminAnalytics(...args),
  downloadAnalyticsExport: (...args) => downloadAnalyticsExport(...args),
}));
vi.mock("@/api/finance", () => ({ getTransactions: (...args) => getTransactions(...args) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("recharts", () => ({
  AreaChart: () => <div data-testid="revenue-chart"/>, Area: () => null,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

const analytics = {
  stats: {
    current_collections: { amount: 125000, percentage_change: 5 },
    active_complaints: { total: 2, high_priority: 1 },
    visitors_at_gate: { total: 1, awaiting_approval: 1 },
    clubhouse_occupancy: { percentage: 25, booked: 4, capacity: 16 },
  },
  sla_alerts: [{ ticket_id: "#TK-1", title: "Lift", overdue_by_mins: 20 }],
  revenue_trend: [{ name: "Aug", value: 125000 }],
  activity_feed: [{ time_ago: "Now", type: "helpdesk", title: "Helpdesk", description: "Ticket updated" }],
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    getAdminAnalytics.mockReset().mockResolvedValue({ data: analytics });
    getTransactions.mockReset().mockResolvedValue({ data: [] });
    downloadAnalyticsExport.mockReset();
    navigate.mockReset();
  });
  afterEach(cleanup);

  it("loads accurate range data and requests 12 calendar months", async () => {
    render(<AdminDashboard />);
    await screen.findByText("₹1,25,000");
    expect(getAdminAnalytics).toHaveBeenCalledWith({ months: 6 });
    expect(screen.getByText("4/16 slots")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "12" } });
    await waitFor(() => expect(getAdminAnalytics).toHaveBeenLastCalledWith({ months: 12 }));
  });

  it("connects SLA and activity drill-down actions", async () => {
    render(<AdminDashboard />);
    await screen.findByText("Resolve Now");
    fireEvent.click(screen.getByRole("button", { name: "Resolve Now" }));
    expect(navigate).toHaveBeenLastCalledWith("/admin/helpdesk");
    fireEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(navigate).toHaveBeenLastCalledWith("/admin/analytics");
  });

  it.each([
    ["Current Collections", "/admin/finance"],
    ["Active Complaints", "/admin/helpdesk"],
    ["Visitors at Gate", "/admin/security"],
    ["Amenity Utilization", "/admin/amenities"],
  ])("opens the %s dashboard module", async (label, destination) => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(label, "i") }));
    expect(navigate).toHaveBeenLastCalledWith(destination);
  });

  it("downloads the analytics export", async () => {
    downloadAnalyticsExport.mockResolvedValue({ data: new Blob(["report"]) });
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: /export report/i }));
    await screen.findByText("Analytics report downloaded.");
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
