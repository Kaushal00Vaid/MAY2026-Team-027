// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "@/pages/AdminDashboard";

const getAdminAnalytics = vi.fn();
const getFinanceLedger = vi.fn();
const downloadAnalyticsExport = vi.fn();
const navigate = vi.fn();
let currentUser;

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/api/analytics", () => ({
  getAdminAnalytics: (...args) => getAdminAnalytics(...args),
  downloadAnalyticsExport: (...args) => downloadAnalyticsExport(...args),
}));
vi.mock("@/features/finance/api", () => ({
  getFinanceLedger: (...args) => getFinanceLedger(...args),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children, sidebarItems, userRole }) => (
    <div data-testid="layout" data-user-role={userRole}>
      <nav>{sidebarItems.map((item) => <span key={item.label}>{item.label}</span>)}</nav>
      {children}
    </div>
  ),
}));
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
    currentUser = { roles: ["super_admin"] };
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

  it("ignores an obsolete analytics response after the range changes", async () => {
    let resolveSix;
    let resolveTwelve;
    getAdminAnalytics.mockImplementation(({ months }) => new Promise((resolve) => {
      if (months === 6) resolveSix = resolve;
      else resolveTwelve = resolve;
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "12" } });

    await act(async () => resolveTwelve({ data: {
      ...analytics,
      stats: { ...analytics.stats, current_collections: { amount: 120000, percentage_change: 0 } },
    } }));
    expect(await screen.findByText("₹1,20,000")).toBeTruthy();

    await act(async () => resolveSix({ data: {
      ...analytics,
      stats: { ...analytics.stats, current_collections: { amount: 60000, percentage_change: 0 } },
    } }));
    expect(screen.getByText("₹1,20,000")).toBeTruthy();
    expect(screen.queryByText("₹60,000")).toBeNull();
  });

  it("only exposes User Roles navigation and labeling to the correct admin role", () => {
    currentUser = { roles: ["committee_member"] };
    const { unmount } = render(<AdminDashboard />);
    expect(screen.queryByText("User Roles")).toBeNull();
    expect(screen.getByTestId("layout").getAttribute("data-user-role")).toBe("Committee Member");
    unmount();

    currentUser = { roles: ["super_admin"] };
    render(<AdminDashboard />);
    expect(screen.getByText("User Roles")).toBeTruthy();
    expect(screen.getByTestId("layout").getAttribute("data-user-role")).toBe("Super Admin");
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

  it("requests and renders each canonical ledger direction before pagination", async () => {
    const credit = { id: 1, unit: "A-101", description: "Maintenance payment", category: "Maintenance", direction: "credit", amount_display: "₹2,500.00", date: "2026-08-23T08:00:00Z" };
    const debit = { id: 2, unit: null, description: "ABC Plumbing — Pipe repair", category: "Repairs", direction: "debit", amount_display: "₹800.00", date: "2026-08-22T08:00:00Z" };
    getFinanceLedger.mockImplementation((_page, _pageSize, direction) => Promise.resolve({
      data: { items: direction === "credit" ? [credit] : direction === "debit" ? [debit] : [credit, debit], total: direction ? 1 : 2, page: 1, page_size: 10 },
    }));

    render(<AdminDashboard />);

    expect(await screen.findByText("A-101")).toBeTruthy();
    expect(screen.getByText("ABC Plumbing — Pipe repair")).toBeTruthy();
    expect(screen.getByText("Cr ₹2,500.00")).toBeTruthy();
    expect(screen.getByText("Dr ₹800.00")).toBeTruthy();
    expect(getFinanceLedger).toHaveBeenCalledWith(1, 10, undefined);

    fireEvent.click(screen.getByRole("button", { name: "credit" }));
    expect(await screen.findByText("A-101")).toBeTruthy();
    expect(screen.queryByText("ABC Plumbing — Pipe repair")).toBeNull();
    expect(getFinanceLedger).toHaveBeenLastCalledWith(1, 10, "credit");

    fireEvent.click(screen.getByRole("button", { name: "debit" }));
    expect(await screen.findByText("ABC Plumbing — Pipe repair")).toBeTruthy();
    expect(screen.queryByText("A-101")).toBeNull();
    expect(getFinanceLedger).toHaveBeenLastCalledWith(1, 10, "debit");
  });

  it("keeps the activity empty state and hides expansion for short feeds", async () => {
    getAdminAnalytics.mockResolvedValue({ data: { ...analytics, activity_feed: [] } });
    const { unmount } = render(<AdminDashboard />);
    expect(await screen.findByText("No recent activity.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /view all/i })).toBeNull();
    unmount();

    getAdminAnalytics.mockResolvedValue({ data: { ...analytics, activity_feed: analytics.activity_feed.slice(0, 4) } });
    render(<AdminDashboard />);
    await screen.findByText("Ticket 4 updated");
    expect(screen.queryByRole("button", { name: /view all/i })).toBeNull();
  });
});
