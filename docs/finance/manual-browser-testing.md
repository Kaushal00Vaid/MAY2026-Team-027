# Finance — browser testing checklist

## Prerequisites

1. Pull the Finance branch and run `cd backend && alembic upgrade head && python seed.py`.
2. Start the API from `backend` and the Vite application from `frontend`.
3. Use the seeded accounts (password `Demo@123`):
   - Resident: `resident.a@societysync.demo`
   - Committee: `committee@societysync.demo`
   - Admin: `superadmin@societysync.com` (configured admin password)

## Admin and committee flow

1. Sign in as an admin and open **Finance**. Confirm the reserve, outstanding amount,
   overdue count, allocation chart, and paginated ledger load without mock USD values.
2. Select **Generate Bulk Invoices**. Enter a future unused billing month, a positive INR
   amount, and a due date. Submit once. Expect a success message, one invoice per active
   resident, and new debit rows in the ledger.
3. Attempt an empty purpose, zero/negative amount, or incomplete form. The browser must
   prevent submission or the screen must display the server validation error.
4. Generate the same purpose and period again. Expect zero new invoices; existing recurring
   invoices must not be duplicated.
5. Use ledger next/previous controls when enough records exist. Expect no duplicate or skipped
   rows and disabled controls at the first/last page.
6. Select **Download Annual Audit**. Expect a non-empty PDF download containing current
   reserve, outstanding, and defaulter information.
7. Sign in as the committee demo account and repeat steps 1–2. Operational Finance access
   should work.

## Resident flow

1. Sign in as `resident.a@societysync.demo` and open **Ledger & Billing**. Confirm the INR
   outstanding balance, late fee, due date, allocation bars, and transaction ledger.
2. Change the filter between all transactions, payments, and charges. Expect the list to update
   immediately; clearing back to all restores every row.
3. Select **Statement**. Expect a non-empty PDF containing only the signed-in resident's unit
   and ledger.
4. Select **Receipt** on the seeded cleared payment. Expect a valid PDF receipt.
5. Select **Pay Now**, switch between bank/card, and confirm. Expect one successful payment,
   the modal to close, a receipt-number success message, refreshed balance, a credit ledger row,
   and the paid invoice to disappear from payable items.
6. Reload the browser after payment. Expect the paid state to persist and no duplicate payment.
7. Pay remaining open invoices one at a time until none remain. Expect **Pay Now** to become
   disabled and the balance to show zero.

## Authorization, negative, and regression cases

1. As a resident, manually navigate to `/admin/finance`. The route guard/API authorization must
   deny admin Finance data; no society-wide ledger may be shown.
2. As support staff, manually navigate to resident/admin Finance URLs. Expect access denial and
   no financial data.
3. Log out on either Finance page and use the browser back button. Expect redirect to sign-in,
   with no protected data flash.
4. Stop the backend and refresh a Finance screen. Expect a visible error and Retry action rather
   than stale mock data or a blank page. Restart the backend and retry successfully.
5. Verify Admin Dashboard **Recent Transactions** still loads; the legacy transaction endpoint
   remains intact.
6. Verify Helpdesk, Community, and Security navigation and authentication still work after the
   Finance migration.

## Expected edge behavior

- Money is shown in INR and persisted as integer paise.
- Late fees are 2% for days 1–7 overdue, 5% for days 8–30, and 10% afterward.
- Residents only see invoices, payments, receipts, and statements belonging to their user/flat.
- Repeated or concurrent payment/bulk-generation submissions commit only one effect.
- Failed/unauthorized operations show an error and do not change balances or the ledger.
