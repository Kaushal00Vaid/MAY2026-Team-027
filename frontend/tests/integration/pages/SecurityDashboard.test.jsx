// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SecurityDashboard from "@/pages/SecurityDashboard";

const api = vi.hoisted(() => ({
  listAllVisitors: vi.fn(),
  listAccessLogs: vi.fn(),
  verifyResidentId: vi.fn(),
  verifyGuestPin: vi.fn(),
  createVisitor: vi.fn(),
  visitorEntry: vi.fn(),
  visitorExit: vi.fn(),
  manualResidentEntry: vi.fn(),
}));

vi.mock("@/features/security/api", () => ({
  ...api,
  securityError: (_error, fallback) => fallback,
}));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({
  useRealtimeRefresh: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { first_name: "Ravi", last_name: "Singh" } }),
}));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("SecurityDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAllVisitors.mockResolvedValue([]);
    api.listAccessLogs.mockResolvedValue({ data: [] });
  });
  afterEach(cleanup);

  it("keeps loading and empty states mutually exclusive", async () => {
    let resolveVisitors;
    api.listAllVisitors.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveVisitors = resolve;
      }),
    );
    render(<SecurityDashboard />);

    expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);
    expect(screen.queryByText("No pending approvals.")).toBeNull();
    resolveVisitors([]);

    expect(await screen.findByText("No pending approvals.")).toBeTruthy();
  });

  it("verifies a scanned resident token and refreshes the feed", async () => {
    api.verifyResidentId.mockResolvedValueOnce({
      data: { subject_name: "Asha Patel" },
    });
    render(<SecurityDashboard />);
    await screen.findByText("No pending approvals.");
    fireEvent.change(screen.getByLabelText("Resident QR token"), {
      target: { value: "signed-resident-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify Resident ID" }));

    await waitFor(() =>
      expect(api.verifyResidentId).toHaveBeenCalledWith({
        token: "signed-resident-token",
      }),
    );
    expect(
      await screen.findByText("Resident entry recorded for Asha Patel."),
    ).toBeTruthy();
    expect(api.listAllVisitors).toHaveBeenCalledTimes(2);
  });

  it("provides a retry after an initial load failure", async () => {
    api.listAllVisitors
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    render(<SecurityDashboard />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to load gate operations",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("No pending approvals.")).toBeTruthy();
    expect(api.listAllVisitors).toHaveBeenCalledTimes(2);
  });

  it("formats visitor and access-log times in the society timezone", async () => {
    const formatter = vi.spyOn(Date.prototype, "toLocaleTimeString");
    api.listAllVisitors.mockResolvedValueOnce([
      {
        id: 1,
        status: "pending",
        unit: "A-101",
        visitor_name: "Guest",
        expires_at: "2026-08-26T04:00:00Z",
      },
    ]);
    api.listAccessLogs.mockResolvedValueOnce({
      data: [
        {
          id: 2,
          subject_name: "Resident",
          event_type: "resident_entry",
          unit: "A-101",
          occurred_at: "2026-08-26T04:00:00Z",
        },
      ],
    });
    render(<SecurityDashboard />);
    await screen.findByText(/Guest/);

    expect(formatter).toHaveBeenCalledWith("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    formatter.mockRestore();
  });
});
