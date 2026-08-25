// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResidentHelpdesk from "@/pages/ResidentHelpdesk";

const api = vi.hoisted(() => ({
  addComment: vi.fn(), analyzeIssue: vi.fn(), createComplaint: vi.fn(),
  downloadAttachment: vi.fn(), getComplaint: vi.fn(), listAttachments: vi.fn(),
  listComments: vi.fn(), listComplaints: vi.fn(), listKnownIssues: vi.fn(),
  listStatusHistory: vi.fn(), subscribeKnownIssue: vi.fn(), uploadAttachment: vi.fn(),
}));

const route = vi.hoisted(() => ({ state: null }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ state: route.state }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { first_name: "Riya", last_name: "Shah" } }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: () => undefined }));
vi.mock("@/features/helpdesk/api", () => ({
  ...api,
  errorMessage: (error, fallback) => error?.response?.data?.detail || fallback,
}));

describe("ResidentHelpdesk assistant", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    route.state = null;
    api.listComplaints.mockResolvedValue({ data: { items: [], page: 1, page_size: 20, total: 0 } });
    api.listKnownIssues.mockResolvedValue({ data: [] });
    api.getComplaint.mockResolvedValue({ data: { id: 99, title: "Older ticket", status: "Open", description: "Details" } });
    api.listComments.mockResolvedValue({ data: [] });
    api.listStatusHistory.mockResolvedValue({ data: [] });
    api.listAttachments.mockResolvedValue({ data: [] });
    api.analyzeIssue.mockResolvedValue({
      data: { message: "Please shut off the local valve and create a plumbing ticket.", suggested_category: "Plumbing", known_issue: null },
    });
  });
  afterEach(cleanup);

  it("sends bounded conversation context and renders the AI reply", async () => {
    render(<ResidentHelpdesk />);
    await screen.findByText("No tickets found.");
    const input = screen.getByRole("textbox", { name: "Message Support Assistant" });
    fireEvent.change(input, { target: { value: "Water is leaking under my sink" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(api.analyzeIssue).toHaveBeenCalledWith(
      "Water is leaking under my sink",
      [{ role: "assistant", content: expect.stringContaining("Hello!") }],
    ));
    expect(await screen.findByText(/shut off the local valve/i)).toBeTruthy();
  });

  it("does not prefill or display a ticket for a general greeting", async () => {
    api.analyzeIssue.mockResolvedValueOnce({
      data: { message: "Hello! How can I help?", suggested_category: "Other", known_issue: null },
    });
    render(<ResidentHelpdesk />);
    await screen.findByText("No tickets found.");
    const input = screen.getByRole("textbox", { name: "Message Support Assistant" });
    fireEvent.change(input, { target: { value: "hii" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Hello! How can I help?")).toBeTruthy();
    expect(screen.queryByText("Possible Duplicate Issue Detected")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Escalate to Human" }));
    expect(screen.getByPlaceholderText("Issue title").value).toBe("");
  });

  it("prevents a duplicate send while the assistant is responding", async () => {
    api.analyzeIssue.mockReturnValue(new Promise(() => undefined));
    render(<ResidentHelpdesk />);
    await screen.findByText("No tickets found.");
    const input = screen.getByRole("textbox", { name: "Message Support Assistant" });
    fireEvent.change(input, { target: { value: "The lift is stuck" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(api.analyzeIssue).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Assistant is responding")).toBeTruthy();
    expect(input.disabled).toBe(true);
  });

  it("shows a safe error and restores the message for retry", async () => {
    api.analyzeIssue
      .mockRejectedValueOnce({ response: { data: { detail: "The Helpdesk assistant is temporarily unavailable. Please retry or create a ticket." } } })
      .mockResolvedValueOnce({ data: { message: "Check the breaker and create a ticket.", suggested_category: "Electrical", known_issue: null } });
    render(<ResidentHelpdesk />);
    await screen.findByText("No tickets found.");
    const input = screen.getByRole("textbox", { name: "Message Support Assistant" });
    fireEvent.change(input, { target: { value: "Power is out" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await screen.findAllByText(/temporarily unavailable/i);
    expect(input.value).toBe("Power is out");
    expect(input.disabled).toBe(false);
    expect(screen.queryByText("Power is out")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Check the breaker and create a ticket.");
    expect(api.analyzeIssue).toHaveBeenLastCalledWith(
      "Power is out",
      [{ role: "assistant", content: expect.stringContaining("Hello!") }],
    );
  });

  it("loads later ticket pages without duplicates", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      title: index === 0 ? "First ticket" : `Ticket ${index + 1}`,
      status: "Open",
      updated_at: "2026-08-01T10:00:00Z",
    }));
    api.listComplaints.mockImplementation(({ page }) => Promise.resolve({
      data: page === 1
        ? { items: firstPage, page: 1, page_size: 20, total: 21 }
        : { items: [{ id: 21, title: "Older ticket", status: "Open", updated_at: "2026-07-01T10:00:00Z" }], page: 2, page_size: 20, total: 21 },
    }));

    render(<ResidentHelpdesk />);
    await screen.findByText("First ticket");
    fireEvent.click(screen.getByRole("button", { name: "Load More Tickets" }));

    expect(await screen.findByText("Older ticket")).toBeTruthy();
    expect(api.listComplaints).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 20 }));
    expect(screen.queryByRole("button", { name: "Load More Tickets" })).toBeNull();
  });

  it("opens a dashboard-linked ticket outside the loaded page", async () => {
    route.state = { ticketId: "99" };
    render(<ResidentHelpdesk />);

    expect(await screen.findByText("TK-99")).toBeTruthy();
    expect(api.getComplaint).toHaveBeenCalledWith(99);
  });

  it("reports attachment failure as partial success without keeping the form open", async () => {
    api.createComplaint.mockResolvedValue({ data: { id: 44 } });
    api.uploadAttachment.mockRejectedValue(new Error("upload failed"));
    render(<ResidentHelpdesk />);
    await screen.findByText("No tickets found.");

    fireEvent.click(screen.getByRole("button", { name: "New Ticket" }));
    fireEvent.change(screen.getByPlaceholderText("Issue title"), { target: { value: "Leaking tap" } });
    const file = new File(["image"], "leak.png", { type: "image/png" });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Ticket" }));

    expect(await screen.findByText("Ticket #44 was created, but its attachment could not be uploaded.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "New Ticket" })).toBeNull();
    expect(api.createComplaint).toHaveBeenCalledTimes(1);
  });
});
