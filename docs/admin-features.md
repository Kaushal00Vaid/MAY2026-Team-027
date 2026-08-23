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

## Helpdesk

### Access

- `super_admin`, `admin`, and `committee_member` accounts can view and manage all complaints.
- Residents can create and view their own complaints; support staff can view only complaints assigned to them. These scopes are enforced in backend queries.
- The User Roles destination is shown only to `super_admin` accounts.

### Features and actions

- **Current Pipeline** lists complaints in most-recently-updated order, supports debounced text search and an Open-only filter, and paginates twenty tickets at a time.
- **Helpdesk metrics** show active, unassigned, approaching-SLA, breached, and resolved-today counts across the society.
- **Escalation Center** displays an active Open/In Progress complaint whose SLA deadline has passed and opens the same update workflow.
- **Raise Ticket** records an Admin-reported complaint with category, description, location, priority, and an optional JPEG, PNG, WebP, or PDF attachment up to 5 MB. A potential-duplicate warning is based on matching open category and location.
- **Assign to Staff / Vendor** validates an active support-staff assignee, creates or updates a work order, moves an Open complaint to In Progress, and stores one instruction per nonblank notes line.
- **Mark as Resolved** records the resolution time, synchronizes an associated work order, adds status history, updates resolved-today metrics, and notifies affected users.
- **Escalate to Committee** timestamps and versions the escalation and records its note in status history.
- Optional internal Admin notes are stored transactionally with assignment and resolution updates and are hidden from resident comment views.

### Validation and expected states

- Category and description cannot be blank after whitespace is removed.
- SLA deadlines are assigned from priority: Critical 4 hours, High 24 hours, Medium/Normal 48 hours, and Low 72 hours.
- Concurrent edits use the complaint version and return a conflict instead of overwriting newer changes.
- Search/filter changes reset pagination; realtime refreshes retain the active search, filter, and page.
- Ticket, statistics, assignee, and known-issue loading failures display an error; empty filters and comment lists have explicit empty states.
- If a ticket is created but its attachment upload fails, the ticket remains saved and the UI reports the partial result without creating another complaint.

## Security

### Access

- `super_admin`, `admin`, and `committee_member` accounts can open Admin Security and manage the complete visitor lifecycle.
- Gate actions and access logs are also available to active support-staff accounts whose staff type is Security. Residents can view only their own visitors and access data through resident pages.
- The User Roles destination is shown only to `super_admin` accounts.

### Features and actions

- **Live Visitor Log** lists visitor requests in newest-first order, supports visitor/purpose/vehicle/target-unit search, and paginates twenty records at a time.
- Selecting a Pending visitor allows approval or denial using optimistic version checks. Approved visitors can record entry; Inside visitors can record exit. Denied, expired, and exited records are read-only.
- **Recent Access Audit** shows the latest twenty immutable security events, including approvals, denials, expiries, visitor entry/exit, guest PIN entry, and resident entry where recorded.
- Every successful lifecycle action updates the visitor row, adds an access-log row, and sends the relevant resident/requester notification in one database transaction.

### Validation and expected states

- Visitor name, target unit, and purpose cannot be blank after whitespace is removed.
- Pending visitor approval requests expire after fifteen minutes. Expiry increments the visitor version and writes a `visitor_expired` audit event.
- Concurrent decisions use the visitor version and return a conflict instead of overwriting a newer decision.
- Search changes reset to page 1; realtime refresh retains the current search and page and updates or closes open visitor details.
- Visitor-list and access-audit failures are isolated so either working section remains usable. Both sections provide loading, empty, and error states.
