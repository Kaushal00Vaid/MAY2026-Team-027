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
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));

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
    api.listBookings.mockReset().mockResolvedValue({ data: { items: [], total: 0 } });
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
    expect(screen.getByText(/informational/i)).toBeTruthy();
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
});
