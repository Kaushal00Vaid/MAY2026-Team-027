# Community — browser testing checklist

## Prerequisites

1. Run `cd backend && alembic upgrade head && python seed.py`.
2. Start backend and frontend locally.
3. Prepare sessions for:
   - Block A resident: `resident.a@societysync.demo` / `Demo@123`
   - Block B resident: `resident.b@societysync.demo` / `Demo@123`
   - Committee: `committee@societysync.demo` / `Demo@123`
   - The configured super-admin account

## Resident community flow

1. Sign in as the Block A resident and open **Community**. Confirm notices, events,
   volunteer opportunities, active poll, discussions, and loading/empty states use live data.
2. Open **View All** notices. Confirm society-wide and Block A/flat-targeted notices appear,
   Block B-only notices do not, and opening/reading a notice persists its read state.
3. RSVP to an event, change the response, reload, and confirm the latest response replaces
   the earlier one rather than adding a duplicate. Respect capacity/closed-event errors.
4. Sign up for an available volunteer opportunity. Confirm counts/state update once. Withdraw,
   reload, and verify availability and counts restore correctly.
5. Cast one vote in the active poll. Expect totals/selection to update and persist. Attempt to
   vote again or change the option; the final vote must remain immutable.
6. Open discussions and verify author, flat, reply count, like count, tag, and timestamps.
7. Repeat with the Block B resident and compare targeted notice visibility. Each resident must
   receive only society-wide and matching block/flat notices.

## Admin and committee flow

1. Open `/admin/community`. Confirm active discussions and the resident directory load.
2. Search the directory by resident name, unit, and role. Clear the input and confirm the full
   directory returns automatically; unmatched searches show the empty state.
3. Select **Broadcast Notice** and create an all-society notice. Confirm both residents see it.
4. Create a Block A notice. Confirm only the Block A resident sees it. Repeat for a specific
   flat and verify exact targeting.
5. Try blank title/body, overlong input, or a block/flat target without a target value. Expect
   validation and no notice creation.
6. Repeat notice creation as committee. Then verify residents cannot manually access the admin
   page or broadcast notices.
7. Use **View All Forums** and open a discussion. Confirm list expansion/collapse and details do
   not duplicate entries.

## Negative, edge, and isolation cases

1. Attempt RSVP for an expired event, volunteer signup after closing/full capacity, and voting
   after poll expiry if corresponding data is available. Expect a visible conflict and no state
   change.
2. Submit the same RSVP/signup action quickly or from two tabs. Expect one effective membership
   per user and stable counts.
3. Verify support staff cannot access resident/admin Community screens or Community records.
4. Stop the backend and refresh. Expect an error/empty recovery state rather than static mock
   content. Restart and reload successfully.
5. Log out and use browser Back. No protected directory or community data should flash.
6. Verify Helpdesk, Security, Finance, authentication, and navigation still work.

## Expected behavior

- Notice delivery/read state is per user and respects all/block/flat targeting.
- RSVP updates are upserts, volunteer membership is unique, and poll votes are final and unique.
- Expired/closed/capacity-limited actions are rejected without partial count changes.
- Residents can access society-visible Community data; operational actions require an admin or
  committee role.
