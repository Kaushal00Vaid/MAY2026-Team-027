# Staff Portal Features

This document records the staff-facing pages and their expected behaviour. It is maintained one page at a time during the final Staff Portal audit.

## Dashboard

The Dashboard is available to authenticated support staff. It provides a read-only operational summary and links to the corresponding staff workflows.

- **Gate activity:** Shows access entries recorded during the current Asia/Kolkata calendar day and visitor approvals that are still pending and unexpired.
- **Roster coverage:** Shows distinct staff scheduled for the current society-local weekday and how many are currently checked in.
- **Inventory status:** Shows active inventory items and items at or below their reorder threshold.
- **Event preparation:** Shows up to three active upcoming community events, their confirmed RSVP counts, and links to Grounds & Operations.

Dashboard data is fetched from `GET /api/v1/analytics/staff`. Resident roles and unauthenticated users are denied access.
