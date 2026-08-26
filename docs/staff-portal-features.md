# Staff Portal Features

This document records the staff-facing pages and their expected behaviour. It is maintained one page at a time during the final Staff Portal audit.

## Dashboard

The Dashboard is available to authenticated support staff. It provides a read-only operational summary and links to the corresponding staff workflows.

- **Gate activity:** Shows access entries recorded during the current Asia/Kolkata calendar day and visitor approvals that are still pending and unexpired.
- **Roster coverage:** Shows distinct staff scheduled for the current society-local weekday and how many are currently checked in.
- **Inventory status:** Shows active inventory items and items at or below their reorder threshold.
- **Event preparation:** Shows up to three active upcoming community events, their confirmed RSVP counts, and links to Grounds & Operations.

Dashboard data is fetched from `GET /api/v1/analytics/staff`. Resident roles and unauthenticated users are denied access.

## Entry Control

Entry Control is available to authenticated support staff whose staff designation is Security.

- **Guest PIN:** Verifies a resident-created, one-use guest PIN and records a guest entry.
- **Resident ID:** Accepts a scanned or pasted signed resident QR token, validates its signature and expiry, and records resident entry.
- **Visitor approvals:** Shows all unexpired pending requests and approved/inside visitors through bounded API pagination. Security staff record visitor entry and exit transitions.
- **Unscheduled visitors:** Creates a time-limited approval request for an active resident unit.
- **Manual resident entry:** Records an entry after staff manually verifies the resident's unit.
- **Live feed:** Shows recent access activity in Asia/Kolkata.

Gate mutations are protected by backend Security-staff permissions, row/state validation, and resident ownership rules.

## Maintenance

Maintenance shows unresolved work orders assigned to the authenticated support staff member.

- **Task queue:** Filters assigned work by urgency, plumbing, or electrical category and shows society-local timestamps.
- **Duty status:** Persists whether the staff member is currently available for assignments.
- **Completion:** Requires every assigned step, technician notes, and a validated proof-of-work image before resolving the work order and linked complaint.
- **Realtime refresh:** Updates assignments while keeping draft data scoped to the same task only.

Completion records status history, resolution evidence, complaint state, and resident notification in one backend transaction.

## Grounds & Operations

Grounds & Operations is available to authenticated support staff and operational administrators.

- **Zone map:** Highlights displayed society zones when they have active operational tasks.
- **Daily tasks:** Shows the signed-in staff member’s tasks and supports permitted pending → in-progress → completed transitions; completion requires notes.
- **Inventory snapshot:** Shows active inventory items, with a clear empty state when none are configured.

Task state changes and inventory data are protected by operations role checks and persisted through the operations endpoints.

## Inventory

Inventory is available to authenticated support staff and lets them manage society supplies.

- **Inventory list:** Supports search, low-stock status, society-local update timestamps, and an empty state.
- **Add item:** Adds a uniquely named item with a unit, opening quantity, reorder threshold, and optional active vendor.
- **Stock movement:** Records an immutable received, consumed, or positive adjustment entry with a required reason. The backend prevents stock from becoming negative.
- **Export:** Downloads the current active inventory as CSV.

Inventory actions use operations authorization, server-side validation, database transactions, and stock-movement history.
