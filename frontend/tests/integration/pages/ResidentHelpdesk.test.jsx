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

vi.mock("react-router-dom", () => ({ useLocation: () => ({ state: null }) }));
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
    api.listComplaints.mockResolvedValue({ data: { items: [] } });
    api.listKnownIssues.mockResolvedValue({ data: [] });
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
    api.analyzeIssue.mockRejectedValue({ response: { data: { detail: "The Helpdesk assistant is temporarily unavailable. Please retry or create a ticket." } } });
    render(<ResidentHelpdesk />);
    await screen.findByText("No tickets found.");
    const input = screen.getByRole("textbox", { name: "Message Support Assistant" });
    fireEvent.change(input, { target: { value: "Power is out" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await screen.findAllByText(/temporarily unavailable/i);
    expect(input.value).toBe("Power is out");
    expect(input.disabled).toBe(false);
  });
});
