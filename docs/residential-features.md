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

## Financials

Financials is available to authenticated flat owners and rental residents. Data is restricted to the signed-in resident's invoices, payments, and ledger entries.

- **Balance:** Shows the combined total and staggered late fees for issued and overdue invoices, plus the earliest due date.
- **Payment:** Pay Now selects the earliest-due open invoice. A successful payment marks that invoice paid, records a ledger credit, and makes its receipt available.
- **Expense allocation:** Shows the society's active fund-allocation percentages or an explicit empty state when no allocation data is configured.
- **Transaction ledger:** Lists the resident's charges and payments and supports charge/payment filtering. Successful payment rows provide receipt downloads.
- **Statement:** Downloads the resident's financial statement as a PDF.

The page uses `GET /api/v1/finance/resident-summary`; payments, statements, and receipts use the corresponding protected finance endpoints. Finance administration endpoints remain unavailable to residents.

## Helpdesk

Helpdesk is available to authenticated flat owners and rental residents. Complaint records, comments, history, and attachments are restricted to the signed-in resident's tickets.

- **Support assistant:** Provides bounded AI Pipe guidance, suggests a ticket category, and shows a related known issue only after a confident category, wording, and resident-location match.
- **Known issues:** Shows active issues for the resident's exact flat, exact block, or common area. Residents may subscribe to those visible issues for updates.
- **Tickets:** Creates a complaint with priority and an optional validated attachment. If an attachment fails after creation, the created ticket is retained and reported accurately.
- **Ticket history:** Loads the resident's ticket history in bounded pages. Dashboard links open the authorized ticket directly even when it is not in the currently loaded page.
- **Ticket details:** Shows status history, public comments, resolution notes, and downloadable attachments. Residents can add public updates to their own tickets.

The page uses the protected complaints and Helpdesk endpoints. Internal comments and other residents' private ticket details are not returned.

## Community

Community is available to authenticated flat owners and rental residents.

- **Notices:** Shows active, unexpired notices addressed to everyone, the resident's block, or the resident's flat. The modal loads older notices in bounded pages and records read state per resident.
- **Polls:** Shows the current active poll, records one final vote per resident, and displays results after voting. A missing poll has a non-actionable empty state.
- **Events:** Shows active events in society-local time. Residents can navigate event pages and confirm or cancel their RSVP subject to event capacity.
- **Volunteering:** Shows every active, unexpired opportunity with previous/next controls. Signup capacity and withdrawals are validated transactionally.

The page uses the protected Community endpoints. Notice targeting, poll votes, RSVPs, and volunteer signups are persisted and scoped to the authenticated resident.

## Analytics

Resident Analytics is the read-only summary embedded in the resident Dashboard. It is available to flat owners and rental residents and is scoped to the authenticated user.

- **Balance:** Shows open invoice totals and the earliest due date.
- **Tickets:** Shows the five most recently updated tickets and links to authorized Helpdesk details.
- **Bookings and events:** Shows current/upcoming resident-relevant activity in society-local time.
- **Notices:** Shows active notices targeted to the resident, including the notice creator when available.

The data is served by `GET /api/v1/analytics/resident`; administrative and staff roles cannot access this endpoint.

## Amenities

Amenities is available to authenticated flat owners and rental residents.

- **Facility list:** Shows active amenities, capacity, operating details, and the selected facility's availability.
- **Availability:** Shows a seven-day society-local calendar with open and occupied slots.
- **Booking:** Residents select a future slot and purpose; the backend enforces overlap, household quota, operating hours, and idempotency rules.
- **My Bookings:** Shows the resident's bookings and allows cancellation of eligible confirmed bookings.

The page uses the protected amenities and booking endpoints. Booking dates and times are displayed in Asia/Kolkata regardless of browser timezone.

## Digital ID

Digital ID is available to authenticated flat owners and rental residents.

- **Resident pass:** Displays a short-lived signed QR credential that refreshes automatically.
- **Guest passes:** Creates one-use guest PINs, lists the resident's passes, and allows active passes to be revoked.
- **Visitor approvals:** Shows pending requests for the resident's unit and records approve/deny decisions with optimistic concurrency protection.
- **Access activity:** Shows the resident's recent access logs.

Security timestamps are displayed in Asia/Kolkata. The backend validates pass signatures, expiry, resident ownership, and role permissions before recording access activity.
