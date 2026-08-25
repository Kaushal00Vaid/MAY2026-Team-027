// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResidentCommunity from "@/pages/ResidentCommunity";

const api = vi.hoisted(() => ({
  listNotices: vi.fn(), listEvents: vi.fn(), getActivePoll: vi.fn(), listVolunteers: vi.fn(),
  markNoticeRead: vi.fn(), signupVolunteer: vi.fn(), withdrawVolunteer: vi.fn(), updateRsvp: vi.fn(), votePoll: vi.fn(),
}));

const route = vi.hoisted(() => ({ state: null }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ state: route.state }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { first_name: "Riya", last_name: "Shah" } }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: () => undefined }));
vi.mock("@/features/community/api", () => ({
  ...api,
  communityError: (_error, fallback) => fallback,
}));

const events = [1, 2, 3].map((id) => ({
  id, title: `Event ${id}`, starts_at: `2026-08-${14 + id}T10:00:00Z`, ends_at: `2026-08-${14 + id}T12:00:00Z`,
  location: "Clubhouse", my_status: "not_going",
}));
const poll = {
  id: 4, question: "Choose a theme", description: "Community event", selected_option_id: null,
  options: [{ id: 8, label: "Green", percentage: 40 }, { id: 9, label: "Blue", percentage: 60 }],
};
const opportunity = { id: 5, title: "Clean-up", description: "Sunday drive", spots_remaining: 2, signed_up: true };

describe("ResidentCommunity", () => {
  beforeEach(() => {
    route.state = null;
    api.listNotices.mockReset().mockResolvedValue({ data: { items: [] } });
    api.listEvents.mockReset().mockResolvedValue({ data: events });
    api.getActivePoll.mockReset().mockResolvedValue({ data: poll });
    api.listVolunteers.mockReset().mockResolvedValue({ data: [opportunity] });
    api.markNoticeRead.mockReset().mockResolvedValue({});
    api.votePoll.mockReset().mockResolvedValue({ data: { ...poll, selected_option_id: 8 } });
    api.updateRsvp.mockReset().mockResolvedValue({ data: { my_status: "going" } });
    api.withdrawVolunteer.mockReset().mockResolvedValue({ data: { ...opportunity, signed_up: false, spots_remaining: 3 } });
    api.signupVolunteer.mockReset();
  });
  afterEach(cleanup);

  it("paginates upcoming events with working arrows", async () => {
    render(<ResidentCommunity />);
    expect(await screen.findByText("Event 1")).toBeTruthy();
    expect(screen.getByText("Event 2")).toBeTruthy();
    expect(screen.queryByText("Event 3")).toBeNull();
    expect(screen.getByRole("button", { name: "Previous events" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next events" }));
    expect(screen.getByText("Event 3")).toBeTruthy();
    expect(screen.queryByText("Event 1")).toBeNull();
  });

  it("opens the page containing an event selected from the dashboard", async () => {
    route.state = { eventId: 3 };
    render(<ResidentCommunity />);

    expect(await screen.findByText("Event 3")).toBeTruthy();
    expect(screen.queryByText("Event 1")).toBeNull();
  });

  it("records a poll vote through an accessible option button", async () => {
    render(<ResidentCommunity />);
    fireEvent.click(await screen.findByRole("button", { name: "Green" }));
    await waitFor(() => expect(api.votePoll).toHaveBeenCalledWith(4, 8));
    expect(await screen.findByText("Vote Recorded")).toBeTruthy();
  });

  it("labels and performs volunteer withdrawal clearly", async () => {
    render(<ResidentCommunity />);
    fireEvent.click(await screen.findByRole("button", { name: /Withdraw/ }));
    await waitFor(() => expect(api.withdrawVolunteer).toHaveBeenCalledWith(5));
    expect(await screen.findByText("Volunteer signup withdrawn.")).toBeTruthy();
  });

  it("retries after the page API fails", async () => {
    api.listEvents.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ data: events });
    render(<ResidentCommunity />);
    expect((await screen.findByRole("alert")).textContent).toContain("Unable to load Community Hub.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Event 1")).toBeTruthy();
    expect(api.listEvents).toHaveBeenCalledTimes(2);
  });
});
