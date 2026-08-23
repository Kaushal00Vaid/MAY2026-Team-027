// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminCommunity from "@/pages/AdminCommunity";

const api = vi.hoisted(() => ({ createNotice: vi.fn(), listDirectory: vi.fn(), listDiscussions: vi.fn() }));
const runtime = vi.hoisted(() => ({ refresh: null, roles: ["admin"] }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { first_name: "Asha", last_name: "Admin", roles: runtime.roles } }) }));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: (_scopes, refresh) => { runtime.refresh = refresh; } }));
vi.mock("@/features/community/api", () => ({ ...api, communityError: (_error, fallback) => fallback }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children, sidebarItems, userRole }) => <div>
    <span data-testid="role">{userRole}</span>
    <nav>{sidebarItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
    {children}
  </div>,
}));

const discussion = { id: 1, title: "Garden planning", body: "Updated body", tag: "General", author: "Riya Shah", author_flat: "A-101", reply_count: 2, like_count: 3, created_at: "2026-08-23T08:00:00Z" };
const resident = { user_id: 9, name: "Maya Rao", unit: "B-202", role: "Owner", status: "Active", joined_at: "2026-01-01T00:00:00Z" };

describe("AdminCommunity", () => {
  beforeEach(() => {
    runtime.roles = ["admin"]; runtime.refresh = null; navigate.mockReset();
    api.listDiscussions.mockReset().mockResolvedValue({ data: { items: [discussion], total: 1, page: 1, page_size: 10 } });
    api.listDirectory.mockReset().mockResolvedValue({ data: { items: [resident], total: 1, page: 1, page_size: 10 } });
    api.createNotice.mockReset().mockResolvedValue({ data: { id: 1 } });
  });
  afterEach(cleanup);

  it("isolates section failures and searches only the directory", async () => {
    api.listDiscussions.mockRejectedValueOnce(new Error("forums unavailable"));
    render(<AdminCommunity />);
    expect(await screen.findByText("Maya Rao")).toBeTruthy();
    expect(await screen.findByText("Unable to load discussions.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search resident directory"), { target: { value: "B-202" } });
    await waitFor(() => expect(api.listDirectory).toHaveBeenLastCalledWith({ search: "B-202", page: 1, page_size: 10 }));
    expect(api.listDiscussions).toHaveBeenCalledTimes(1);
  });

  it("paginates discussions and residents using server totals", async () => {
    api.listDiscussions.mockImplementation(({ page }) => Promise.resolve({ data: { items: [{ ...discussion, id: page, title: `Discussion ${page}` }], total: 21 } }));
    api.listDirectory.mockImplementation(({ page }) => Promise.resolve({ data: { items: [{ ...resident, user_id: page, name: `Resident ${page}` }], total: 21 } }));
    render(<AdminCommunity />);
    expect(await screen.findByText("Discussion 1")).toBeTruthy();
    expect(await screen.findByText("Resident 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next discussions" }));
    fireEvent.click(screen.getByRole("button", { name: "Next residents" }));
    expect(await screen.findByText("Discussion 2")).toBeTruthy();
    expect(await screen.findByText("Resident 2")).toBeTruthy();
  });

  it("shows broadcast errors in the modal and prevents duplicate submissions", async () => {
    let rejectNotice;
    api.createNotice.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectNotice = reject; }));
    render(<AdminCommunity />);
    fireEvent.click(await screen.findByRole("button", { name: "Broadcast Notice" }));
    fireEvent.change(screen.getByLabelText("Notice title"), { target: { value: "Water shutdown" } });
    fireEvent.change(screen.getByLabelText("Notice message"), { target: { value: "Tomorrow morning" } });
    const submit = screen.getAllByRole("button", { name: "Broadcast Notice" }).at(-1);
    fireEvent.click(submit); fireEvent.click(submit);
    expect(api.createNotice).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Close notice form" }).disabled).toBe(true);
    rejectNotice(new Error("network"));
    expect(await screen.findByText("Unable to broadcast notice.")).toBeTruthy();
    expect(screen.getByDisplayValue("Water shutdown")).toBeTruthy();
  });

  it("hides super-admin actions from admins", async () => {
    render(<AdminCommunity />);
    await screen.findByText("Maya Rao");
    expect(screen.queryByRole("link", { name: "User Roles" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Resident" })).toBeNull();
    expect(screen.getByTestId("role").textContent).toBe("Residential Admin");
    expect(screen.queryByText(/manage resident directory/i)).toBeNull();
  });

  it("closes discussion details when realtime refresh removes the thread", async () => {
    api.listDiscussions.mockResolvedValueOnce({ data: { items: [discussion], total: 1 } }).mockResolvedValueOnce({ data: { items: [], total: 0 } });
    render(<AdminCommunity />);
    fireEvent.click(await screen.findByText("Garden planning"));
    expect(screen.getByRole("button", { name: "Close discussion" })).toBeTruthy();
    await runtime.refresh();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close discussion" })).toBeNull());
  });
});
