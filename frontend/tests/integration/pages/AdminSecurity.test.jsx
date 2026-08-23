// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminSecurity from "@/pages/AdminSecurity";

const api = vi.hoisted(() => ({
  decideVisitor: vi.fn(), listAccessLogs: vi.fn(), listVisitors: vi.fn(),
  visitorEntry: vi.fn(), visitorExit: vi.fn(),
}));
let currentUser;
let realtimeRefresh;

vi.mock("@/features/security/api", () => ({ ...api, securityError: (_error, fallback) => fallback }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: (_scopes, refresh) => { realtimeRefresh = refresh; } }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children, sidebarItems, userRole }) => <div data-testid="layout" data-user-role={userRole}><nav>{sidebarItems.map((item) => <span key={item.label}>{item.label}</span>)}</nav>{children}</div>,
}));

const visitor = (overrides = {}) => ({
  id: 1, visitor_name: "Maya", purpose: "Delivery", unit: "A-101",
  vehicle_number: null, requested_at: "2026-08-23T08:00:00Z", status: "pending",
  resident_name: "Alice Resident", version: 1, ...overrides,
});
const accessLog = { id: 5, event_type: "approval_requested", subject_name: "Maya", unit: "A-101", gate: "Main Gate", details: "Delivery", occurred_at: "2026-08-23T08:00:00Z" };

describe("AdminSecurity", () => {
  beforeEach(() => {
    currentUser = { first_name: "Diana", last_name: "Committee", roles: ["committee_member"] };
    realtimeRefresh = undefined;
    api.listVisitors.mockReset().mockResolvedValue({ data: { items: [visitor()], total: 21, page: 1, page_size: 20 } });
    api.listAccessLogs.mockReset().mockResolvedValue({ data: [accessLog] });
    api.decideVisitor.mockReset().mockResolvedValue({ data: visitor({ status: "approved", version: 2 }) });
    api.visitorEntry.mockReset().mockResolvedValue({ data: visitor({ status: "inside", version: 2 }) });
    api.visitorExit.mockReset().mockResolvedValue({ data: visitor({ status: "exited", version: 3 }) });
  });
  afterEach(cleanup);

  it("paginates visitors, renders the access audit, and filters role navigation", async () => {
    render(<AdminSecurity />);
    expect((await screen.findAllByText("Maya")).length).toBeGreaterThan(0);
    expect(screen.getByText("approval requested")).toBeTruthy();
    expect(api.listVisitors).toHaveBeenCalledWith(expect.objectContaining({ page: 1, page_size: 20 }));
    expect(api.listAccessLogs).toHaveBeenCalledWith(20);
    expect(screen.queryByText("User Roles")).toBeNull();
    expect(screen.getByTestId("layout").getAttribute("data-user-role")).toBe("Committee Member");
    fireEvent.click(screen.getByRole("button", { name: "Next visitor page" }));
    await waitFor(() => expect(api.listVisitors).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 20 })));
  });

  it("keeps visitor data available when access-audit loading fails", async () => {
    api.listAccessLogs.mockRejectedValueOnce(new Error("audit unavailable"));
    render(<AdminSecurity />);
    expect((await screen.findAllByText("Maya")).length).toBeGreaterThan(0);
    expect(screen.getByText("Unable to load the access audit.")).toBeTruthy();
  });

  it("prevents repeated decisions and keeps mutation errors in the modal", async () => {
    let rejectDecision;
    api.decideVisitor.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectDecision = reject; }));
    render(<AdminSecurity />);
    fireEvent.click((await screen.findAllByText("Maya"))[0].closest("tr"));
    const approve = screen.getByRole("button", { name: "Approve" });
    fireEvent.click(approve);
    fireEvent.click(approve);
    expect(api.decideVisitor).toHaveBeenCalledTimes(1);
    rejectDecision(new Error("conflict"));
    expect(await screen.findByText("Unable to update visitor.")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Maya" })).toBeTruthy();
  });

  it("updates an open visitor modal from realtime list state", async () => {
    render(<AdminSecurity />);
    fireEvent.click((await screen.findAllByText("Maya"))[0].closest("tr"));
    expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
    api.listVisitors.mockResolvedValue({ data: { items: [visitor({ status: "approved", version: 2 })], total: 1, page: 1, page_size: 20 } });
    await realtimeRefresh();
    expect(await screen.findByRole("button", { name: "Record Entry" })).toBeTruthy();
  });
});
