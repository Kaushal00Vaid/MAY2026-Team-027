# Staff Operations, Inventory, and Roster — browser testing checklist

## Prerequisites

1. Run `cd backend && alembic upgrade head && python seed.py`.
2. Start the backend and frontend locally.
3. Prepare sessions for maintenance staff (`maintenance@societysync.demo` / `Demo@123`),
   security staff (`security@societysync.demo` / `Demo@123`), committee, and super-admin.

## Operational tasks

1. As maintenance staff open `/gate/operations`. Confirm assigned checklist tasks and the live
   inventory snapshot load without hardcoded data.
2. Create a task with title, location, and category. Blank/whitespace values must be rejected.
3. Open a pending task and start it. Reload and confirm `in progress` persists.
4. Attempt completion without notes; expect validation. Add notes and complete it; confirm its
   completion timestamp/state persists and the zone indicator updates.
5. Confirm invalid transitions (completed back to pending, cancelled to completed) are rejected.
6. Verify one support-staff account cannot view or change another staff member's assigned tasks.

## Inventory

1. Open `/gate/inventory`. Confirm item quantity, normalized unit, category, last update, vendor,
   and derived stock state load. Search and clear search; the full list must return automatically.
2. Add an item with valid unit, opening quantity, reorder threshold, and optional vendor. Reload
   and confirm one item and an opening-stock movement persist.
3. Try duplicate/blank names, unknown units, negative stock, and negative threshold. Expect errors
   without partial records.
4. Receive stock and confirm quantity increases. Consume stock and confirm quantity decreases.
5. Attempt to consume more than available; expect `409`, unchanged quantity, and no movement.
6. Cross the reorder threshold and confirm status is derived as `LOW STOCK`; increase stock and
   confirm it returns to `REORDER SOON` or `OPTIMAL` without storing display text.
7. Download the CSV export and confirm current item/category/quantity/unit/status values.
8. Rapidly consume the same item in two sessions. Row locking must prevent negative stock or lost
   updates.

## Roster and authorization

1. As staff open `/gate/roster`. Confirm only the authenticated staff member's schedule appears;
   assignment and leave-management actions must not appear.
2. Select **Check In**, reload, and confirm the on-duty state and timestamp persist. Select
   **Check Out** once; a repeated attempt must be rejected and no duplicate daily attendance
   record may be created.
3. As admin/committee navigate directly to `/gate/roster`. Confirm all staff schedules appear.
4. Assign a valid recurring shift. Reload and confirm it persists with the correct days/times.
5. Attempt an overlapping shift for the same staff member and working day, including an overnight
   shift. Expect a conflict and no duplicate assignment.
6. Mark a shift `On Leave`, reload, then restore `Active`. Confirm both changes persist.
7. Export the roster CSV and verify staff, role, time, days mask, and status.
8. Confirm residents cannot access any `/gate/operations`, `/gate/inventory`, or `/gate/roster`
   route or corresponding API.

## Approved OAuth regression fixes

1. Run `alembic heads`; expect only `20260808_04 (head)` and no duplicate-revision warning.
2. Test from both a fresh database and a database previously stamped `20260808_02`; upgrade must
   reach the head without deleting OAuth or Amenities data.
3. Complete a new Google profile by entering a phone number. Confirm the profile is complete but
   `is_phone_verified` remains false until OTP verification succeeds.
4. Configure only `VITE_API_URL` to a non-default backend URL and initiate Google login. Confirm
   the browser uses that configured backend rather than `localhost:8000`.
5. Regression-test password login, Google login, refresh, logout, and role redirects.

## Failure and regression cases

1. Stop the backend and reload each screen. Expect a visible error/Retry state, not mock data.
2. Log out and use browser Back. No task, inventory, or roster data should flash.
3. Verify Authentication, Finance, Helpdesk, Community, Security, and Amenities still load.

## Expected behavior

- Checklist tasks are separate from complaint-driven maintenance work orders.
- Stock changes are immutable movements applied in a locked transaction; status is derived.
- Operational roles manage the roster; staff see their personal schedule and permitted tasks/stock.
- Audited data is status-managed rather than hard-deleted.
