# Admin Features

This document records the verified behavior of each Admin page. It is updated page by page during the final Admin audit so operational explanations do not need to be placed in the application UI.

## Dashboard

### Access

- Available to `super_admin`, `admin`, and `committee_member` accounts.
- Authentication and role checks are enforced by both the protected frontend route and the backend analytics and finance endpoints.
- User-role administration remains restricted to `super_admin` accounts.

### Features and actions

- **Current Collections** shows successful payments recorded in the current calendar month and links to Finance.
- **Active Complaints** shows unresolved complaints and the high-priority subset, and links to Helpdesk.
- **Visitors at Gate** shows visitors awaiting approval and links to Security.
- **Amenity Utilization** shows today's confirmed/completed bookings against the available configured slots and links to Amenities.
- **SLA Breach Alert** lists up to five open complaints past their assigned resolution deadline and links to Helpdesk.
- **Revenue Trend** charts successful payments over the selected six- or twelve-calendar-month range.
- **Recent Transactions** shows the ten latest entries from the canonical finance ledger. `Credit` entries are successful payments and `Debit` entries include invoices/receivables and recorded expenses.
- **Activity Feed** combines recent security access, complaint-status, and amenity-booking events. “View All” expands the bounded feed on the same page.
- **Export Report** downloads the analytics CSV available to Admin roles.

### Expected states

- Analytics and finance data load independently; a failure in one area displays its own error without hiding working sections.
- Empty revenue, transaction, and activity data display empty states rather than fabricated values.
- Changing the revenue range refreshes analytics for the selected number of months.

## Finance

### Access

- Available to `super_admin`, `admin`, and `committee_member` accounts.
- Summary, ledger, bulk-invoice, expense, and annual-audit endpoints enforce an operational Admin role in the backend.
- The User Roles destination is shown only to `super_admin` accounts.

### Features and actions

- **Society Transparency Report** shows the current reserve (successful payment credits less recorded expense debits), outstanding issued/overdue invoice value, overdue invoice count, and configured target fund-allocation percentages.
- **Master Ledger** is the canonical chronological record. Invoice receivables, late fees, and expenses create debit entries; successful payments create credit entries.
- **Generate Bulk Invoices** creates at most one invoice per unique active resident flat for a period and purpose, preferring an owner account when a flat has both owner and tenant accounts. Existing matching flat invoices are skipped. Each created invoice also creates a receivable debit.
- **Record Expense** stores the expense and creates its matching Master Ledger debit.
- **Download Annual Audit** downloads the current calendar year's PDF with collections, expenses, net cash flow, current financial snapshot, invoice statuses, configured allocations, and recent ledger activity for that year.
- Ledger pagination displays ten entries per page.

### Validation and expected states

- Invoice purpose and expense text fields cannot be blank after whitespace is removed.
- Invoice amount and expense amount must be positive and no more than ₹10,00,000.
- An invoice due date cannot be earlier than the first day of its billing period.
- Retrying an unchanged bulk-invoice request uses the same idempotency key; changing its payload starts a new request.
- A zero-invoice result explains whether all eligible flats were already invoiced or no eligible resident flats exist.
- Loading failures offer a retry. Action failures remain in the relevant form, and successful actions refresh the first ledger page.
- An empty ledger and missing fund allocations display explicit empty states.
