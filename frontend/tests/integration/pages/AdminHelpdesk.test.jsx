// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminHelpdesk from "@/pages/AdminHelpdesk";

const api = vi.hoisted(() => ({
  createComplaint: vi.fn(), escalateComplaint: vi.fn(), getStats: vi.fn(),
  listAssignees: vi.fn(), listComments: vi.fn(), listComplaints: vi.fn(),
  listKnownIssues: vi.fn(), updateComplaint: vi.fn(), uploadAttachment: vi.fn(),
}));
let currentUser;

vi.mock("@/features/helpdesk/api", () => ({
  ...api,
  errorMessage: (_error, fallback) => fallback,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: () => undefined }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children, sidebarItems, userRole }) => <div data-testid="layout" data-user-role={userRole}><nav>{sidebarItems.map((item) => <span key={item.label}>{item.label}</span>)}</nav>{children}</div>,
}));

const ticket = (id, overrides = {}) => ({
  id, title: `Ticket ${id}`, category: "Plumbing", description: `Description ${id}`,
  location: "Block A", priority: "High", status: "Open", assigned_to: null,
  work_order_notes: null, sla_deadline: null, version: 1, ...overrides,
});
const stats = { active: 2, unassigned: 1, sla_warning: 1, breached: 0, resolved_today: 0 };

describe("AdminHelpdesk", () => {
  beforeEach(() => {
    currentUser = { first_name: "Diana", last_name: "Committee", roles: ["committee_member"] };
    api.listComplaints.mockReset().mockResolvedValue({ data: { items: [ticket(1), ticket(2)], total: 21, page: 1, page_size: 20 } });
    api.getStats.mockReset().mockResolvedValue({ data: stats });
    api.listAssignees.mockReset().mockResolvedValue({ data: [{ user_id: 99, name: "Sam Staff", staff_type: "Maintenance", on_duty: true }] });
    api.listKnownIssues.mockReset().mockResolvedValue({ data: [] });
    api.listComments.mockReset().mockResolvedValue({ data: [] });
    api.createComplaint.mockReset().mockResolvedValue({ data: { id: 30 } });
    api.uploadAttachment.mockReset().mockResolvedValue({ data: {} });
    api.updateComplaint.mockReset().mockResolvedValue({ data: ticket(1, { version: 2 }) });
    api.escalateComplaint.mockReset().mockResolvedValue({ data: ticket(1, { version: 2 }) });
  });
  afterEach(cleanup);

  it("paginates the pipeline and hides unauthorized navigation", async () => {
    render(<AdminHelpdesk />);
    expect(await screen.findByText("Ticket 1")).toBeTruthy();
    expect(api.listComplaints).toHaveBeenCalledWith(expect.objectContaining({ page: 1, page_size: 20 }));
    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.queryByText("User Roles")).toBeNull();
    expect(screen.getByTestId("layout").getAttribute("data-user-role")).toBe("Committee Member");

    fireEvent.click(screen.getByRole("button", { name: "Next ticket page" }));
    await waitFor(() => expect(api.listComplaints).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 20 })));
  });

  it("keeps tickets usable when auxiliary Helpdesk data fails", async () => {
    api.listAssignees.mockRejectedValueOnce(new Error("staff unavailable"));
    render(<AdminHelpdesk />);
    expect(await screen.findByText("Ticket 1")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("supporting Helpdesk data");
    fireEvent.click(screen.getByRole("button", { name: "Update ticket 1" }));
    expect(await screen.findByRole("dialog", { name: /Update Ticket TK-1/i })).toBeTruthy();
  });

  it("reports attachment failure without creating a duplicate ticket", async () => {
    api.uploadAttachment.mockRejectedValueOnce(new Error("storage unavailable"));
    render(<AdminHelpdesk />);
    fireEvent.click(await screen.findByRole("button", { name: "Raise Ticket" }));
    fireEvent.change(screen.getByLabelText("Ticket description"), { target: { value: "Pipe is leaking" } });
    const file = new File(["%PDF"], "evidence.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Ticket" }));

    expect(await screen.findByText(/Ticket #30 was created, but its attachment could not be uploaded/i)).toBeTruthy();
    expect(api.createComplaint).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Raise Ticket" })).toBeNull();
  });

  it("resolves with one atomic payload and excludes assignment-only fields", async () => {
    api.listComplaints.mockResolvedValue({ data: { items: [ticket(1, { assigned_to: 99, work_order_notes: "Inspect" })], total: 1, page: 1, page_size: 20 } });
    render(<AdminHelpdesk />);
    fireEvent.click(await screen.findByRole("button", { name: "Update ticket 1" }));
    fireEvent.change(screen.getByLabelText("Ticket action"), { target: { value: "Mark as Resolved" } });
    fireEvent.change(screen.getByLabelText("Internal admin note"), { target: { value: "Resident confirmed" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Action" }));

    await waitFor(() => expect(api.updateComplaint).toHaveBeenCalledWith(1, {
      expected_version: 1,
      internal_note: "Resident confirmed",
      status: "Resolved",
      status_note: "Resident confirmed",
    }));
  });

  it("ignores comments returned for a previously selected ticket", async () => {
    let resolveFirst; let resolveSecond;
    api.listComments
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    render(<AdminHelpdesk />);
    fireEvent.click(await screen.findByRole("button", { name: "Update ticket 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Close update ticket form" }));
    fireEvent.click(screen.getByRole("button", { name: "Update ticket 2" }));

    await act(async () => resolveSecond({ data: [{ id: 2, author_name: "Second", body: "Second comment" }] }));
    expect(await screen.findByText("Second comment")).toBeTruthy();
    await act(async () => resolveFirst({ data: [{ id: 1, author_name: "First", body: "Stale first comment" }] }));
    expect(screen.getByText("Second comment")).toBeTruthy();
    expect(screen.queryByText("Stale first comment")).toBeNull();
  });
});
