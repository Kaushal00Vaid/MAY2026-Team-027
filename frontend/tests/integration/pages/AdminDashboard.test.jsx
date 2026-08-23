// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "@/pages/AdminDashboard";

const getAdminAnalytics = vi.fn();
const getFinanceLedger = vi.fn();
const downloadAnalyticsExport = vi.fn();
const navigate = vi.fn();

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/api/analytics", () => ({
  getAdminAnalytics: (...args) => getAdminAnalytics(...args),
  downloadAnalyticsExport: (...args) => downloadAnalyticsExport(...args),
}));
vi.mock("@/features/finance/api", () => ({
  getFinanceLedger: (...args) => getFinanceLedger(...args),
}));
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
  activity_feed: Array.from({ length: 6 }, (_, index) => ({
    time_ago: "Now",
    type: "helpdesk",
    title: "Helpdesk",
    description: `Ticket ${index + 1} updated`,
  })),
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    getAdminAnalytics.mockReset().mockResolvedValue({ data: analytics });
    getFinanceLedger.mockReset().mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 10 } });
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

  it("explains SLA breaches and expands activity without leaving the dashboard", async () => {
    render(<AdminDashboard />);
    await screen.findByText("Resolve Now");
    expect(screen.getByText(/passed their resolution deadline/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resolve Now" }));
    expect(navigate).toHaveBeenLastCalledWith("/admin/helpdesk");
    expect(screen.queryByText("Ticket 6 updated")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(screen.getByText("Ticket 6 updated")).toBeTruthy();
    expect(screen.getByRole("button", { name: /show recent/i }).getAttribute("aria-expanded")).toBe("true");
    expect(navigate).toHaveBeenCalledTimes(1);
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

  it("renders and filters recent transactions from the canonical finance ledger", async () => {
    getFinanceLedger.mockResolvedValue({
      data: {
        items: [
          { id: 1, unit: "A-101", description: "Maintenance payment", category: "Maintenance", direction: "credit", amount_display: "₹2,500.00", date: "2026-08-23T08:00:00Z" },
          { id: 2, unit: null, description: "ABC Plumbing — Pipe repair", category: "Repairs", direction: "debit", amount_display: "₹800.00", date: "2026-08-22T08:00:00Z" },
        ],
        total: 2,
        page: 1,
        page_size: 10,
      },
    });

    render(<AdminDashboard />);

    expect(await screen.findByText("A-101")).toBeTruthy();
    expect(screen.getByText("ABC Plumbing — Pipe repair")).toBeTruthy();
    expect(screen.getByText("Cr ₹2,500.00")).toBeTruthy();
    expect(screen.getByText("Dr ₹800.00")).toBeTruthy();
    expect(getFinanceLedger).toHaveBeenCalledWith(1, 10);

    fireEvent.click(screen.getByRole("button", { name: "credit" }));
    expect(screen.getByText("A-101")).toBeTruthy();
    expect(screen.queryByText("ABC Plumbing — Pipe repair")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "debit" }));
    expect(screen.queryByText("A-101")).toBeNull();
    expect(screen.getByText("ABC Plumbing — Pipe repair")).toBeTruthy();
  });
});
