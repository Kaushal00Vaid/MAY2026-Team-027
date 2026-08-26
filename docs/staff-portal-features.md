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
