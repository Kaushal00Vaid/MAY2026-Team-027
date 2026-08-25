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

The remaining resident pages will be documented as each page completes its audit cycle.
