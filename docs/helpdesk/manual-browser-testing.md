# Helpdesk — browser testing checklist

## Prerequisites

1. Run `cd backend && alembic upgrade head && python seed.py`.
2. Start the backend and frontend locally.
3. Prepare separate normal/incognito browser sessions for:
   - Resident: `resident.a@societysync.demo` / `Demo@123`
   - Maintenance staff: `maintenance@societysync.demo` / `Demo@123`
   - Committee: `committee@societysync.demo` / `Demo@123`
   - The configured super-admin account
4. Have one valid JPG/PNG/WebP image, one PDF, one unsupported file, and an oversized
   file available for upload validation.

## Resident flow

1. Sign in as the resident and open **Helpdesk**. Confirm known issues and only that
   resident's tickets are displayed, with loading and empty states behaving correctly.
2. Select **New Ticket**, enter a title, description, category, priority, and location,
   optionally attach a supported file, then submit. Expect one ticket with the entered
   location and an initial `Open` status/history entry.
3. Try blank required fields, excessively long content, an unsupported file, and an
   oversized file. Expect inline validation/error feedback and no ticket creation.
4. Create/search for a complaint compatible with an existing known issue. Expect the
   duplicate warning; subscribe to updates and confirm the subscribed state persists.
5. Open a ticket and verify description, status history, attachments, resolution notes,
   and comments. Download an attachment and confirm its contents and filename.
6. Add a non-empty comment. Expect it to appear once after refresh. Try a blank comment;
   it must not be created.
7. Toggle **My Open Tickets / View All**. Open-only must exclude resolved tickets and
   switching back must restore the complete personal list.
8. Confirm the resident cannot see tickets belonging to the second demo resident.

## Admin and committee flow

1. Open **Admin → Helpdesk**. Confirm statistics, pipeline cards, locations, priorities,
   statuses, SLA breach information, and available assignees load from the backend.
2. Search by ticket title, category, location, resident, or ID. Clear the input and confirm
   the complete list returns automatically. Toggle the open-only filter and clear it.
3. Raise a ticket with and without an attachment. Confirm it appears once and preserves
   its actual location; `N/A` should appear only when no location exists.
4. Open an unassigned ticket, select **Assign to Staff / Vendor**, choose the maintenance
   demo user, add required steps and a note, and confirm. Expect `In Progress`, assignment
   history, and a staff maintenance work order.
5. Escalate an eligible ticket. Expect its escalation timestamp/history and SLA display to
   update. Repeating an invalid transition must show a conflict without changing history.
6. Resolve an eligible ticket with resolution notes. Expect `Resolved`, a resolution
   timestamp, resident visibility, and an immutable status-history record.
7. Repeat the operational tests with the committee account. Then verify a resident cannot
   manually navigate to `/admin/helpdesk` or access society-wide records.

## Maintenance-staff flow

1. Sign in as maintenance staff and open `/gate/maintenance`. Confirm only assigned work
   orders are listed and their complaint location is correct.
2. Toggle duty status, reload the page, and confirm it persists and appears correctly in
   the admin assignee list.
3. Select an assigned task. Verify complaint description, required steps, instructions,
   and technician notes.
4. Attempt completion without checking every required step, without notes, or without a
   proof image. Expect validation and no status change.
5. Complete all steps, add resolution notes, upload a supported image, and close the task.
   Expect the task to leave the active list and the resident complaint to show resolution
   notes/photo and completed history.
6. Verify staff cannot access unassigned work orders or admin/resident-only Helpdesk pages.

## Negative, edge, and regression cases

1. Open the same ticket in two admin tabs. Update it in one, then submit stale data in the
   other. Expect a conflict rather than silently overwriting the newer state.
2. Stop the backend and reload each Helpdesk screen. Expect a visible error/Retry state,
   not stale mock data. Restart and retry successfully.
3. Log out and use browser Back. No complaint or task content should flash before sign-in.
4. Verify Finance, Community, Security, dashboard navigation, and authentication still work.

## Expected behavior

- Complaint and work-order state changes follow the permitted transition sequence.
- Invalid transitions return a visible conflict and create no partial audit records.
- Residents are isolated to their records; operational roles can manage all complaints;
  staff see only assigned tasks.
- Files are MIME/size validated and server-selected paths are never exposed.
- Location falls back to the resident's unit where supported and is `N/A` only when absent.

## Resident AI assistant

The Resident Helpdesk assistant sends bounded conversation history to the backend.
The backend calls AI Pipe with `AIPIPE_API_KEY`, so the credential must exist only
in `backend/.env` and must never use a frontend `VITE_` variable. Verify that a
resident can ask a follow-up question, receives a concise response, and can still
use the suggested category and known-issue subscription flow. Also verify that an
unavailable AI service shows a retry/ticket message without losing the typed text.
