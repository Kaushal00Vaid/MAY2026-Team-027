// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffInventory from "@/pages/StaffInventory";

const listInventory = vi.fn();
const inventoryOptions = vi.fn();

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/gate/GateSidebarConfig", () => ({
  getGateSidebarItems: () => [],
}));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({
  useRealtimeRefresh: () => {},
}));
vi.mock("@/features/operations/api", () => ({
  listInventory: (...args) => listInventory(...args),
  inventoryOptions: (...args) => inventoryOptions(...args),
  createInventoryItem: vi.fn(),
  recordMovement: vi.fn(),
  downloadCsv: vi.fn(),
  saveCsv: vi.fn(),
  operationsError: (_error, fallback) => fallback,
}));

const items = [
  { id: 1, name: "Garden gloves", category: "Gardening", quantity: 4, unit: "pairs", status: "OPTIMAL", updated_at: "2026-08-26T08:30:00Z" },
  { id: 2, name: "Floor cleaner", category: "Cleaning", quantity: 2, unit: "L", status: "LOW STOCK", updated_at: "2026-08-26T08:30:00Z" },
];

describe("StaffInventory", () => {
  beforeEach(() => {
    listInventory.mockReset().mockResolvedValue({ data: items });
    inventoryOptions.mockReset().mockResolvedValue({ data: { units: [], vendors: [] } });
  });
  afterEach(cleanup);

  it("clears a stock movement draft when another item is selected", async () => {
    render(<StaffInventory />);
    fireEvent.click(await screen.findByText("Garden gloves"));
    fireEvent.change(screen.getByPlaceholderText("Quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText("Reason / reference"), { target: { value: "Monthly restock" } });
    fireEvent.click(screen.getByText("Floor cleaner"));

    expect(screen.getByPlaceholderText("Quantity").value).toBe("");
    expect(screen.getByPlaceholderText("Reason / reference").value).toBe("");
  });

  it("formats item update times in the society timezone", async () => {
    const formatter = vi.spyOn(Date.prototype, "toLocaleString");
    render(<StaffInventory />);
    await screen.findByText("Garden gloves");

    expect(formatter).toHaveBeenCalledWith("en-IN", { timeZone: "Asia/Kolkata" });
    formatter.mockRestore();
  });

  it("keeps newer search results when an earlier request resolves late", async () => {
    let resolveOld;
    let resolveNew;
    listInventory.mockImplementation((search) => {
      if (search === "old") return new Promise((resolve) => { resolveOld = resolve; });
      if (search === "new") return new Promise((resolve) => { resolveNew = resolve; });
      return Promise.resolve({ data: [] });
    });
    render(<StaffInventory />);
    const search = screen.getByPlaceholderText("Search supplies...");
    fireEvent.change(search, { target: { value: "old" } });
    await waitFor(() => expect(resolveOld).toBeTypeOf("function"));
    fireEvent.change(search, { target: { value: "new" } });
    await waitFor(() => expect(resolveNew).toBeTypeOf("function"));

    resolveNew({ data: [{ ...items[1], name: "New result" }] });
    expect(await screen.findByText("New result")).toBeTruthy();
    resolveOld({ data: [{ ...items[0], name: "Old result" }] });

    await waitFor(() => expect(screen.queryByText("Old result")).toBeNull());
    expect(screen.getByText("New result")).toBeTruthy();
  });
});
