// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAmenities from "@/pages/AdminAmenities";
import { localDate } from "@/features/amenities/api";

const api = vi.hoisted(() => ({
  cancelBooking: vi.fn(), createAmenity: vi.fn(), getAvailability: vi.fn(),
  listAmenities: vi.fn(), listBookings: vi.fn(), updateAmenity: vi.fn(),
}));

vi.mock("@/features/amenities/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ...api,
  amenitiesError: (_error, fallback) => fallback,
}));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: () => undefined }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children, sidebarItems, userRole }) => <div>
    <span data-testid="admin-role">{userRole}</span>
    <nav>{sidebarItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
    {children}
  </div>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { roles: ["admin"] } }) }));

const amenity = {
  id: 7, name: "Clubhouse", description: "Community events and meetings.",
  image_url: null, capacity: 40, operating_start: "06:00:00",
  operating_end: "22:00:00", slot_minutes: 60, weekly_limit: 3, is_active: true,
};

const todayIst = localDate(new Date());
const slots = Array.from({ length: 10 }, (_, index) => {
  const hour = String(6 + index).padStart(2, "0");
  const nextHour = String(7 + index).padStart(2, "0");
  return {
    starts_at: `${todayIst}T${hour}:00:00+05:30`,
    ends_at: `${todayIst}T${nextHour}:00:00+05:30`,
    available: true,
    booking: null,
  };
});

describe("AdminAmenities", () => {
  beforeEach(() => {
    api.listAmenities.mockReset().mockResolvedValue({ data: [amenity] });
    api.getAvailability.mockReset().mockResolvedValue({ data: { amenity, slots } });
    api.listBookings.mockReset().mockResolvedValue({ data: { items: [], total: 125 } });
    api.updateAmenity.mockReset().mockResolvedValue({ data: amenity });
    api.createAmenity.mockReset();
    api.cancelBooking.mockReset();
  });
  afterEach(cleanup);

  it("loads the selected seven-day range once and renders every time slot", async () => {
    render(<AdminAmenities />);

    expect((await screen.findAllByText("Available")).length).toBe(10);
    expect(api.listAmenities).toHaveBeenCalledTimes(1);
    expect(api.getAvailability).toHaveBeenCalledTimes(1);
    expect(api.listBookings).toHaveBeenCalledTimes(1);
    expect(api.listBookings).toHaveBeenCalledWith(expect.objectContaining({
      amenity_id: 7, page_size: 100, start_date: expect.any(String), end_date: expect.any(String),
    }));
    expect(screen.getByText("Bookings in this 7-day view")).toBeTruthy();
    expect(screen.getByText("125")).toBeTruthy();
    expect(screen.queryByText(/informational/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /user roles/i })).toBeNull();
    expect(screen.getByTestId("admin-role").textContent).toBe("Residential Admin");
  });

  it("edits supported amenity details", async () => {
    render(<AdminAmenities />);
    await screen.findByText("Community events and meetings.");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Updated clubhouse details" } });
    fireEvent.change(screen.getByLabelText(/Weekly household limit/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(api.updateAmenity).toHaveBeenCalledWith(7, expect.objectContaining({
      description: "Updated clubhouse details", weekly_limit: 4,
    })));
    expect(await screen.findByText("Amenity updated.")).toBeTruthy();
  });

  it("keeps availability usable when only the booking total fails", async () => {
    api.listBookings.mockRejectedValueOnce(new Error("summary unavailable"));
    render(<AdminAmenities />);

    expect((await screen.findAllByText("Available")).length).toBe(10);
    expect(screen.getByTitle("Unable to load booking count.")).toBeTruthy();
    expect(screen.queryByText("Unable to load amenity schedule.")).toBeNull();
  });

  it("reconciles an open booking when refreshed availability no longer contains it", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const booking = {
      id: 99, resident_name: "Maya Rao", unit: "A-101", purpose: "Fitness",
      status: "confirmed", starts_at: future,
    };
    api.getAvailability
      .mockResolvedValueOnce({ data: { amenity, slots: [{ ...slots[0], starts_at: future, booking, available: false }] } })
      .mockResolvedValueOnce({ data: { amenity, slots } });
    render(<AdminAmenities />);

    fireEvent.click(await screen.findByText(/A-101.*Fitness/));
    expect(screen.getByText("Booking Details")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /next week/i }));

    await waitFor(() => expect(screen.queryByText("Booking Details")).toBeNull());
  });

  it("ignores an older schedule response after navigating to another week", async () => {
    let rejectOld;
    api.getAvailability
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }))
      .mockResolvedValueOnce({ data: { amenity, slots } });
    render(<AdminAmenities />);
    await waitFor(() => expect(api.getAvailability).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect((await screen.findAllByText("Unavailable")).length).toBeGreaterThan(0);
    rejectOld(new Error("stale request failed"));

    await waitFor(() => expect(screen.queryByText("Unable to load amenity schedule.")).toBeNull());
    expect((screen.getAllByText("Unavailable")).length).toBeGreaterThan(0);
  });

  it("submits an open booking cancellation only once", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const booking = {
      id: 101, resident_name: "Maya Rao", unit: "A-101", purpose: "Fitness",
      status: "confirmed", starts_at: future,
    };
    let resolveCancel;
    api.getAvailability
      .mockResolvedValueOnce({ data: { amenity, slots: [{ ...slots[0], starts_at: future, booking, available: false }] } })
      .mockResolvedValueOnce({ data: { amenity, slots } });
    api.cancelBooking.mockImplementationOnce(() => new Promise((resolve) => { resolveCancel = resolve; }));
    render(<AdminAmenities />);
    fireEvent.click(await screen.findByText(/A-101.*Fitness/));

    const cancel = screen.getByRole("button", { name: "Cancel Booking" });
    fireEvent.click(cancel);
    fireEvent.click(cancel);
    expect(api.cancelBooking).toHaveBeenCalledTimes(1);
    resolveCancel({});
    expect(await screen.findByText("Booking cancelled.")).toBeTruthy();
  });
});
