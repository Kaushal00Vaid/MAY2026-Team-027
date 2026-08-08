# Amenities — browser testing checklist

## Prerequisites

1. Run `cd backend && alembic upgrade head && python seed.py`.
2. Start backend and frontend locally.
3. Prepare separate browser/incognito sessions for:
   - Resident A: `resident.a@societysync.demo` / `Demo@123`
   - Resident B: `resident.b@societysync.demo` / `Demo@123`
   - Committee: `committee@societysync.demo` / `Demo@123`
   - The configured super-admin account

## Resident booking flow

1. Sign in as Resident A and open **Amenities**. Confirm active amenity cards, descriptions,
   images, capacity, weekly quota, availability calendar, and personal bookings load from the API.
2. Switch between amenities. Each calendar, operating-hour range, and weekly quota must refresh
   for the selected amenity without stale slots.
3. Select an available future slot, choose a purpose, and confirm. Expect one booking, a success
   message, a booked calendar cell, an incremented quota, and a persisted **My Bookings** entry.
4. Reload the browser. The reservation and quota must persist.
5. Cancel a future confirmed reservation. Expect `cancelled`, the slot to become available, and
   the quota to be released for another booking.
6. Move to the next week and create a booking. Confirm the displayed quota applies to the selected
   week and resets at Sunday midnight in Asia/Kolkata.
7. Verify past slots, already-booked slots, and slots outside operating hours cannot be selected.
8. Book repeatedly up to the selected facility's weekly limit. The next attempt must show a clear
   quota conflict and create no additional booking.

## Collision and concurrency protection

1. Open the same available slot as Resident A and Resident B in separate sessions.
2. Confirm both bookings as close together as possible. Exactly one must succeed; the other must
   receive a visible “slot was just booked” conflict.
3. Refresh both calendars. Both must show one booking effect, never overlapping confirmed records.
4. Double-click/rapidly submit one confirmation. Idempotency must produce one reservation and one
   quota increment.

## Admin and committee flow

1. Open `/admin/amenities`. Confirm all active/inactive facilities, the selected week's schedule,
   actual resident unit/purpose on booked slots, facility rules, and booking counts load.
2. Navigate weeks and switch amenities. Confirm schedule dates and bookings do not leak from the
   previously selected amenity/week.
3. Select a booked cell. Verify resident, unit, time, purpose, and status. Cancel an upcoming
   booking and confirm the resident calendar and personal list update.
4. Select **+**, create an amenity with name, description, opening/closing time, capacity, slot
   duration, and weekly limit. Expect it to appear once with generated availability.
5. Try blank/duplicate names, closing before opening, zero capacity, invalid slot duration, and
   invalid weekly limits. Expect validation/conflict and no amenity creation.
6. Deactivate an amenity with no upcoming reservations. Residents must no longer see/book it;
   admins must still see it marked inactive and may reactivate it.
7. Attempt to deactivate an amenity with an upcoming confirmed booking. Expect a conflict requiring
   cancellation first; the existing booking must remain intact.
8. Repeat applicable operational actions as committee. Confirm resident/support-staff accounts
   cannot access the admin page or configuration APIs.

## Edge, failure, and regression cases

1. Attempt to cancel an already cancelled/completed booking or a booking that has started. Expect
   a conflict and no audit/state change.
2. Confirm Resident A cannot list or cancel Resident B's bookings and cannot see Resident B's
   identity inside unavailable calendar slots.
3. Test a slot near midnight/weekly boundary. Dates and quota must follow Asia/Kolkata rather than
   the server's local timezone.
4. Stop the backend and reload each Amenities page. Expect a visible error and Retry behavior,
   not randomized/mock availability. Restart and recover successfully.
5. Log out and use browser Back or direct protected URLs. No amenity booking data should flash.
6. Verify authentication, Finance, Helpdesk, Community, Security, and dashboard navigation still work.

## Expected behavior

- Only future, aligned slots within configured operating hours are bookable.
- PostgreSQL prevents overlapping confirmed bookings even under concurrent requests.
- Booking creation is idempotent and per-flat weekly limits are race-safe.
- Residents see only their booking details; operational roles see the society schedule.
- Audited bookings are cancelled/completed rather than deleted.
