// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAnalytics from "@/pages/AdminAnalytics";

const getAdminAdvancedAnalytics = vi.fn();
const downloadAnalyticsExport = vi.fn();

vi.mock("@/api/analytics", () => ({
  getAdminAdvancedAnalytics: (...args) => getAdminAdvancedAnalytics(...args),
  downloadAnalyticsExport: (...args) => downloadAnalyticsExport(...args),
}));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("recharts", () => ({
  BarChart: ({ children }) => <div>{children}</div>, Bar: ({ children }) => <div>{children}</div>,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>, RadialBarChart: ({ children }) => <div>{children}</div>,
  RadialBar: () => null, PolarAngleAxis: () => null, Cell: () => null,
}));

const vendors = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  name: `Provider ${index + 1}`,
  type: "Maintenance",
  res: `${index + 1}.0`,
  sla: "Within SLA",
}));
const analytics = {
  pareto: [{ name: "Plumbing", value: 3 }],
  vendors,
  financial: { ratio: 80, collections: "₹1.2L", opex: "₹30.0K" },
  amenities: [{ id: 1, name: "Gymnasium" }, { id: 2, name: "Clubhouse" }],
  selected_amenity_id: 1,
  heatmap: [{ day: "Mon", date: "2026-08-10", slots: [{ value: 2, bookings: 3, label: "06:00" }] }],
};

describe("AdminAnalytics", () => {
  beforeEach(() => {
    getAdminAdvancedAnalytics.mockReset().mockResolvedValue({ data: analytics });
    downloadAnalyticsExport.mockReset();
  });
  afterEach(cleanup);

  it("loads real analytics and filters by amenity", async () => {
    render(<AdminAnalytics />);
    expect(await screen.findByText("₹1.2L")).toBeTruthy();
    expect(getAdminAdvancedAnalytics).toHaveBeenCalledWith({ amenityId: null });
    expect(screen.getByTitle("Mon 06:00: 3 booking(s)")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Select amenity" }), { target: { value: "2" } });
    await waitFor(() => expect(getAdminAdvancedAnalytics).toHaveBeenLastCalledWith({ amenityId: 2 }));
  });

  it("expands and collapses the provider table", async () => {
    render(<AdminAnalytics />);
    await screen.findByText("Provider 1");
    expect(screen.queryByText("Provider 6")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View All" }));
    expect(screen.getByText("Provider 6")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show Less" }));
    expect(screen.queryByText("Provider 6")).toBeNull();
  });

  it("reports a completed export only after download succeeds", async () => {
    downloadAnalyticsExport.mockResolvedValue({ data: new Blob(["report"]) });
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<AdminAnalytics />);
    fireEvent.click(await screen.findByRole("button", { name: "Export Report" }));
    expect(await screen.findByText("Analytics report downloaded.")).toBeTruthy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report");
    click.mockRestore();
  });

  it("reports export failures", async () => {
    downloadAnalyticsExport.mockRejectedValue(new Error("network"));
    render(<AdminAnalytics />);
    fireEvent.click(await screen.findByRole("button", { name: "Export Report" }));
    expect(await screen.findByText("Please try downloading the report again.")).toBeTruthy();
  });

  it("retries an analytics loading failure", async () => {
    getAdminAdvancedAnalytics
      .mockReset()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ data: analytics });
    render(<AdminAnalytics />);
    expect((await screen.findByRole("alert")).textContent).toContain("Unable to load analytics.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("₹1.2L")).toBeTruthy();
    expect(getAdminAdvancedAnalytics).toHaveBeenCalledTimes(2);
  });
});
