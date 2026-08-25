# Residential Features

This document records the resident-facing pages and their expected behaviour. It is maintained page by page during the final resident audit.

## Dashboard

The Dashboard is available to authenticated flat owners and rental residents. It provides a read-only summary of the signed-in resident's account and links into the relevant resident workflows.

- **Balance:** Shows unpaid issued or overdue invoices, the next due date, and shortcuts to payment and the financial statement.
- **Helpdesk:** Shows the resident's five most recently updated tickets. Status filters apply to the loaded summary, and selecting a ticket opens it in Helpdesk.
- **Digital ID:** Shows the resident's short-lived signed access pass and automatically refreshes it before expiry.
- **Bookings:** Shows up to three confirmed bookings that have not ended, using society-local time.
- **Events:** Shows up to three upcoming active events. Selecting an event opens the Community page containing that event.
- **Notices:** Shows up to five active, unexpired notices addressed to everyone, the resident's block, or the resident's flat. View All opens the Community notices view.

Dashboard data is fetched from `GET /api/v1/analytics/resident`. Other roles are denied access to this resident endpoint.

The remaining resident pages will be documented as each page completes its audit cycle.
