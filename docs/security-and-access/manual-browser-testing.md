# Security and access — browser testing checklist

## Prerequisites

1. Run `cd backend && alembic upgrade head && python seed.py`.
2. Start backend and frontend locally.
3. Open separate normal/incognito sessions for:
   - Resident: `resident.a@societysync.demo` / `Demo@123` (`A-101`)
   - Security: `security@societysync.demo` / `Demo@123`
   - Committee: `committee@societysync.demo` / `Demo@123`
   - The configured super-admin account

## Visitor approval lifecycle

1. As security, open `/gate`. Confirm pending visitors, gate actions, live access feed,
   PIN keypad, scanner placeholder, and unscheduled check-in form load without mock data.
2. Submit an unscheduled visitor for `A-101` with name, purpose, optional phone/vehicle.
   Expect one pending request with a short expiry and an `approval_requested` log entry.
3. Try blank name/unit and a nonexistent unit. Expect disabled submission or a visible error,
   with no visitor record.
4. In the resident session, open **Digital ID**. Confirm the request appears under pending
   approvals. Approve it and confirm both sessions show `approved` after refresh.
5. As security, record entry. Expect `inside`, an entry timestamp, and access log. Record
   exit and expect `exited`, exit timestamp, and another immutable log.
6. Create another visitor and deny it as the resident. Confirm no entry action is available.
7. Use an expired seeded/requested visitor if available. Confirm it cannot be approved or
   admitted and is shown as expired after the expiry processing/API refresh.
8. Open the same visitor in two operational sessions and make conflicting decisions. The
   stale decision must return a conflict rather than overwrite the first decision.

## Guest-pass and PIN flow

1. As resident, enter a guest name and select **Create Pass**. Record the displayed four-digit
   PIN and confirm an active six-hour pass appears.
2. As security, enter that PIN once using the keypad. Expect successful verification and an
   access-log event. Reusing the one-use PIN must fail.
3. Create another pass, revoke it as the resident, and attempt verification at the gate.
   Expect rejection and no successful-entry audit event.
4. Try an incomplete/incorrect PIN. Submission should remain disabled or show an error.
5. Confirm one resident cannot list, revoke, or otherwise manage another resident's passes.

## Resident digital ID and manual entry

1. Verify the Digital ID shows the authenticated resident name/unit and a countdown that
   renews the short-lived token without reloading the page.
2. Reload after a token refresh and confirm the resident remains authenticated.
3. As security, select **Manual Unit Entry**, enter `A-101`, and submit. Expect exactly one
   resident-entry record in the live feed and resident access log.
4. Try blank and nonexistent units. Expect validation/error and no audit record.
5. Confirm the resident's recent access log shows visitor, guest-pass, and resident-entry
   activity in chronological order.

## Admin and authorization flow

1. As admin/committee, open `/admin/security`. Confirm search, visitor details, target units,
   vehicle data, timestamps, and statuses load correctly.
2. Search by visitor/unit and then clear the search. The complete list must automatically
   return without a page refresh.
3. Exercise valid actions for pending, approved, and inside visitors. Completed/denied/expired
   visitors must show no action.
4. Verify residents cannot enter `/admin/security` or `/gate`, security cannot access resident
   Digital ID/admin pages, and unauthenticated users are redirected to sign-in.

## Failure and regression cases

1. Stop the backend while screens are open. Expect visible errors rather than fabricated data;
   restart and confirm reload/retry recovers.
2. Log out, use browser Back, and manually enter protected URLs. No access data should flash.
3. Verify Helpdesk, Community, Finance, authentication, and dashboard navigation still work.

## Expected behavior

- Visitor lifecycle is `pending → approved/denied/expired`; only approved visitors can enter,
  only inside visitors can exit, and all actions are audited.
- Guest PINs are random, time-bounded, revocable, and one-use.
- Resident data is flat/user isolated; gate and operational actions require authorized roles.
- Invalid or stale actions do not create partial visitor or access-log changes.
