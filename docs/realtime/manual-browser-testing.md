# Realtime & Notifications — Browser Testing

## Prerequisites

1. Pull the latest feature branch and run `alembic upgrade head` inside `backend`.
2. Run `python seed.py` once. It is idempotent and creates a demo notification.
3. Start the API at `http://localhost:8000` and the frontend at `http://localhost:5173`.
4. Use two separate browser profiles (or one normal and one private window) so Admin/Staff and Resident sessions stay independent.
5. Ensure both windows remain online. No Postman or direct API calls are required.

## Notification centre and session lifecycle

1. Sign in as any seeded account and open a dashboard.
   - Expected: the existing header bell is visible, with an unread badge when unread notifications exist.
2. Open the bell.
   - Expected: notifications load newest-first; loading and empty states render cleanly; the page layout does not move.
3. Click an unread notification, then use **Mark all read**.
   - Expected: the dot/count decreases correctly and remains read after refreshing the browser.
4. Log out, wait several seconds, and navigate back to a protected URL.
   - Expected: protected content is unavailable, the socket is closed, and the user is redirected to Sign In.
5. Log back in.
   - Expected: a fresh connection is created automatically and persisted notifications are restored.

## Visitor approval and gate updates

1. Keep a resident's **Identity & Access** page open in one window and a staff **Gate** page open in another.
2. At the gate, create an unscheduled visitor request for the resident's exact unit.
   - Expected: within a few seconds, the resident bell count increases and the pending visitor appears without refreshing.
3. Approve the visitor as the resident.
   - Expected: the gate screen changes from pending to an entry action without refreshing; the requesting staff account receives the decision notification.
4. Record entry and then exit at the gate.
   - Expected: the resident receives each event and their access activity refreshes automatically.
5. Negative: create a request for a different flat.
   - Expected: the first resident receives nothing; only the targeted flat receives the request.

## Helpdesk updates

1. Keep Admin Helpdesk open and create a complaint as a resident.
   - Expected: the admin notification count increases and the new complaint appears automatically.
2. Assign/update the complaint as admin while the resident page is open.
   - Expected: the resident receives the update and the ticket status refreshes.
3. Complete an assigned work order as support staff with valid notes/photo.
   - Expected: the resident sees the resolved status and receives a resolution notification.
4. Negative: another resident must not receive or see the complaint notification.

## Finance, amenities, community, inventory, and roster

1. **Finance:** complete a successful resident payment while the resident finance screen is open.
   - Expected: a payment-success notification appears and finance totals/history refresh. A simulated failed payment creates no success notification.
2. **Amenities:** keep Admin Amenities and Resident Amenities open in separate sessions; create or cancel a booking.
   - Expected: both authorized views refresh availability/bookings and receive the correct event.
3. **Community:** broadcast a notice to all residents, then to a specific block/flat.
   - Expected: only matching recipients receive the notification; their Community page refreshes automatically.
4. **Inventory:** consume stock until it is at/below its reorder threshold.
   - Expected: Admin/Committee/Support Staff receive a low-stock alert and inventory screens refresh; residents do not receive it.
5. **Roster:** assign a shift or change its status while the affected staff roster is open.
   - Expected: only the assigned staff member receives the notification and their roster refreshes.

## Resilience and edge cases

1. Put a connected browser offline, generate an event from the second session, then restore connectivity.
   - Expected: the socket reconnects automatically; the durable notification appears after reopening/refocusing the notification list (or page reload), and REST screen state remains correct.
2. Open the same account in two tabs and generate several events quickly.
   - Expected: no page crashes; notification IDs prevent duplicates within each tab; unread values never become negative.
3. Restart the backend while a dashboard is open.
   - Expected: the UI remains usable and reconnects with exponential backoff after the API returns.
4. Leave a dashboard open for longer than the 15-minute access-token lifetime, then generate an event.
   - Expected: normal token refresh establishes a new ticket/socket and events continue without signing in again.
5. Confirm the browser WebSocket URL contains only `ticket=...` and never an access JWT; reconnecting with an already-used ticket must fail.

## Regression checks

- Password, OTP, Google login, silent refresh, logout, and role redirects still work.
- Existing Helpdesk, Security, Finance, Amenities, Community, and Staff Operations actions retain their prior validation and error handling.
- Search/filter inputs retain their values when a background refresh occurs.
- The dashboard header, responsive layout, theme, and navigation remain unchanged apart from making the existing bell functional.
