// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffRoster from "@/pages/StaffRoster";

const listShifts = vi.fn();
const listStaff = vi.fn();
const updateShiftStatus = vi.fn();

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/gate/GateSidebarConfig", () => ({
  getGateSidebarItems: () => [],
}));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({
  useRealtimeRefresh: () => {},
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { roles: ["admin"] } }),
}));
vi.mock("@/features/operations/api", () => ({
  listShifts: (...args) => listShifts(...args),
  listStaff: (...args) => listStaff(...args),
  updateShiftStatus: (...args) => updateShiftStatus(...args),
  createShift: vi.fn(),
  downloadCsv: vi.fn(),
  getTodayAttendance: vi.fn(),
  operationsError: (_error, fallback) => fallback,
  saveCsv: vi.fn(),
  toggleAttendance: vi.fn(),
}));

const shift = { id: 7, staff_id: 11, staff_name: "Asha Patel", role_label: "Security", start_time: "06:00:00", end_time: "14:00:00", days_mask: 31, status: "active" };

describe("StaffRoster", () => {
  beforeEach(() => {
    listShifts.mockReset().mockResolvedValue({ data: [shift] });
    listStaff.mockReset().mockResolvedValue({ data: [{ user_id: 11, name: "Asha Patel", staff_type: "Security" }] });
    updateShiftStatus.mockReset().mockResolvedValue({ data: { ...shift } });
  });
  afterEach(cleanup);

  it("lets roster administrators set active shifts on leave or inactive", async () => {
    render(<StaffRoster />);
    expect(await screen.findByText("Asha Patel")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Set Inactive" }));
    await waitFor(() => expect(updateShiftStatus).toHaveBeenCalledWith(7, "inactive"));
  });

  it("clears an unsaved assignment when the dialog is closed", async () => {
    render(<StaffRoster />);
    fireEvent.click(await screen.findByRole("button", { name: /Assign Shift/i }));
    fireEvent.change(screen.getByPlaceholderText("Role label"), { target: { value: "Night security" } });
    fireEvent.click(screen.getByRole("button", { name: "Close assignment form" }));
    fireEvent.click(screen.getByRole("button", { name: /Assign Shift/i }));

    expect(screen.getByPlaceholderText("Role label").value).toBe("Security");
  });
});
