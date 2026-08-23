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
