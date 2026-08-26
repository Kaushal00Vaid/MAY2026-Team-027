// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffOperations from "@/pages/StaffOperations";

const listTasks = vi.fn();
const listInventory = vi.fn();

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
  listTasks: (...args) => listTasks(...args),
  listInventory: (...args) => listInventory(...args),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  operationsError: (_error, fallback) => fallback,
}));

const tasks = [
  {
    id: 1,
    title: "Inspect Block A",
    location: "Block A",
    status: "in_progress",
  },
  {
    id: 2,
    title: "Clean Clubhouse",
    location: "Clubhouse",
    status: "in_progress",
  },
];

describe("StaffOperations", () => {
  beforeEach(() => {
    listTasks.mockReset().mockResolvedValue({ data: tasks });
    listInventory.mockReset().mockResolvedValue({ data: [] });
  });
  afterEach(cleanup);

  it("derives every displayed zone status from active tasks", async () => {
    render(<StaffOperations />);

    expect(await screen.findByText("Inspect Block A")).toBeTruthy();
    expect(screen.getAllByText("Attention")).toHaveLength(2);
    expect(screen.getAllByText("Clear")).toHaveLength(2);
  });

  it("shows an explicit empty state for inventory", async () => {
    render(<StaffOperations />);

    expect(await screen.findByText("No active inventory items.")).toBeTruthy();
  });

  it("does not retain completion notes when selecting another task", async () => {
    render(<StaffOperations />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Inspect Block A/i }),
    );
    const notes = screen.getByPlaceholderText("Completion notes required");
    fireEvent.change(notes, { target: { value: "Finished inspection" } });
    fireEvent.click(screen.getByRole("button", { name: /Clean Clubhouse/i }));

    expect(screen.getByPlaceholderText("Completion notes required").value).toBe(
      "",
    );
  });
});
