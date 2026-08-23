// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUserManagement from "@/pages/AdminUserManagement";

const api = vi.hoisted(() => ({ listManagedUsers: vi.fn(), updateUserRole: vi.fn() }));

vi.mock("@/api/users", () => api);
vi.mock("@/context/AuthContext", () => ({ useAuthContext: () => ({ user: { user_id: 99, roles: ["super_admin"] } }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));

const target = {
  user_id: 1, first_name: "Maya", last_name: "Rao", email: "maya@example.com",
  phone_number: "+919999999991", flat_number: "A-101", building_block: "A",
  roles: ["flat_owner"], is_active: true, created_at: "2026-01-02T00:00:00Z",
};
const response = (items = [target], overrides = {}) => ({
  data: { items, total: 25, page: 1, page_size: 20, role_counts: { super_admin: 1, flat_owner: 24, admin: 0 }, ...overrides },
});

describe("AdminUserManagement", () => {
  beforeEach(() => {
    api.listManagedUsers.mockReset().mockResolvedValue(response());
    api.updateUserRole.mockReset();
  });
  afterEach(cleanup);

  it("uses server pagination, search, role totals, and canonical unit labels", async () => {
    render(<AdminUserManagement />);
    expect(await screen.findByText("Maya Rao")).toBeTruthy();
    expect(screen.getByText("A-101")).toBeTruthy();
    expect(screen.queryByText("A-A-101")).toBeNull();
    expect(screen.getByText("Showing 1–1 of 25 users")).toBeTruthy();
    expect(screen.queryByText(/assign and manage roles/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next users" }));
    await waitFor(() => expect(api.listManagedUsers).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, search: "", role: "all" }));
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "A-101" } });
    await waitFor(() => expect(api.listManagedUsers).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, search: "A-101", role: "all" }));
  });

  it("ignores stale user-list responses", async () => {
    let resolveInitial;
    api.listManagedUsers
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockResolvedValueOnce(response([{ ...target, first_name: "Latest" }], { total: 1 }));
    render(<AdminUserManagement />);
    await waitFor(() => expect(api.listManagedUsers).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "Latest" } });
    expect(await screen.findByText("Latest Rao")).toBeTruthy();
    resolveInitial(response([{ ...target, first_name: "Stale" }], { total: 1 }));
    await waitFor(() => expect(screen.queryByText("Stale Rao")).toBeNull());
    expect(screen.getByText("Latest Rao")).toBeTruthy();
  });

  it("submits one role update and reconciles the canonical server user", async () => {
    let resolveUpdate;
    api.updateUserRole.mockImplementationOnce(() => new Promise((resolve) => { resolveUpdate = resolve; }));
    render(<AdminUserManagement />);
    fireEvent.click(await screen.findByRole("button", { name: "Change Role" }));
    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    const confirm = screen.getByRole("button", { name: "Confirm Change" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(api.updateUserRole).toHaveBeenCalledTimes(1);
    resolveUpdate({ data: { ...target, first_name: "Canonical", roles: ["admin"] } });
    expect(await screen.findByText("Canonical Rao")).toBeTruthy();
    expect(screen.getByText("Role Updated")).toBeTruthy();
  });

  it("preserves the existing row after a failed role update", async () => {
    api.updateUserRole.mockRejectedValueOnce({ response: { data: { detail: "A flat number is required." } } });
    render(<AdminUserManagement />);
    fireEvent.click(await screen.findByRole("button", { name: "Change Role" }));
    fireEvent.click(screen.getByRole("button", { name: "Admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(await screen.findByText("A flat number is required.")).toBeTruthy();
    expect(screen.getByText("Maya Rao")).toBeTruthy();
    expect(screen.getAllByText("Flat Owner").length).toBeGreaterThan(0);
  });
});
