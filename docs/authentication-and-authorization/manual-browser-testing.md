# Authentication and authorization — browser testing checklist

## Prerequisites

1. Run `cd backend && alembic upgrade head && python seed.py`.
2. Start backend and frontend locally.
3. Prepare normal/incognito browser sessions and these seeded accounts:
   - Resident: `resident.a@societysync.demo` / `Demo@123`
   - Committee: `committee@societysync.demo` / `Demo@123`
   - Maintenance: `maintenance@societysync.demo` / `Demo@123`
   - Security: `security@societysync.demo` / `Demo@123`
   - The configured super-admin account
4. Keep browser developer tools available only for observing requests/cookies; all actions and
   assertions should still be performed through the UI.

## Password login and role redirects

1. From a fresh browser session open `/signin`, enter valid resident credentials, and submit.
   The first attempt must navigate directly to `/resident`, never `/unauthorized`.
2. Repeat from fresh sessions for each role:
   - Super-admin/admin/committee → `/admin`
   - Flat owner/rental resident → `/resident`
   - Support staff/security/maintenance → `/gate`
3. Reload each landing page. Expect the session to restore through refresh-cookie rotation with
   a loading screen and no sign-in or protected-content flash.
4. Try a case-varied email and surrounding whitespace if the UI permits it. Email lookup should
   be case-insensitive/normalized.
5. Try wrong password, unknown email, malformed email, and blank fields. Expect generic safe
   feedback, no authenticated session, and no account-existence disclosure beyond implemented
   validation.
6. Submit valid credentials rapidly/double-click. Expect one stable session and correct role
   redirect without duplicated navigation or `/unauthorized` race behavior.

## Registration flow

1. Open `/signup` and register with a unique name, email, international-format phone, password,
   and profile/unit details exposed by the form. Expect a success state and one new account.
2. Try mismatched passwords, a password under eight characters, invalid phone/email, blank names,
   duplicate case-insensitive email, and duplicate normalized phone. Expect validation/error and
   no duplicate user.
3. Sign in with the newly registered account and confirm its current implemented resident role
   routes to `/resident` and cannot access admin/staff routes.
4. Verify signup cannot be used to self-assign admin, committee, or staff privileges even if
   client-visible fields are manipulated through normal browser controls.

## Session refresh and persistence

1. Sign in, reload repeatedly, and navigate across several protected pages. The authenticated
   user and roles must remain consistent.
2. Leave a session open beyond the access-token lifetime (15 minutes), then trigger navigation or
   data loading. Expect transparent refresh and successful retry without returning to sign-in.
3. Open several protected pages/tabs when the access token expires. Concurrent failures should
   share one refresh flow and all recover or all consistently sign out.
4. Close and reopen the browser while the refresh cookie is still valid. Expect session recovery
   according to cookie persistence settings.
5. Confirm access tokens are not stored in localStorage/sessionStorage or displayed in URLs; the
   refresh token must remain an HttpOnly cookie.

## Logout and invalid-session handling

1. Log out from every role. Protected content must disappear immediately and redirect to sign-in.
2. After logout, use browser Back and manually navigate to `/admin`, `/resident`, and `/gate`.
   Expect sign-in with no protected-page flash.
3. Reload after logout. The revoked refresh session must not authenticate again.
4. Log in as one user, log out, then immediately log in as a different role. Expect only the new
   user's profile/roles and correct redirect; no stale name, data, or permissions.
5. Start logout while another page request/refresh is in progress. A late response must not
   restore the cleared session.

## Role-based authorization

1. As resident, manually enter `/admin`, `/admin/users`, and `/gate`. Expect `/unauthorized` for
   authenticated role mismatch and no protected data.
2. As support staff, try `/resident` and `/admin`. Expect access denial.
3. As committee/admin, verify operational admin pages work but `/admin/users` is restricted to
   `super_admin`.
4. As super-admin, verify `/admin/users` loads and normal admin/resident/staff users cannot reach it.
5. Test mixed navigation through direct URLs and browser history. Frontend route guards and backend
   API permissions must agree; hiding a link alone is not sufficient.
6. In two sessions with different roles, verify data returned to one role never appears after
   switching/logging into the other role in the same browser.

## Failure and regression cases

1. Start the frontend with the backend stopped. Sign-in should show a useful error and remain on
   the public page. Start the backend and retry successfully.
2. Stop the backend during an authenticated session, then restore it. Expect controlled errors and
   successful recovery; the app must not incorrectly redirect to `/unauthorized`.
3. Verify account inactivity is rejected if an inactive test account is available.
4. Verify Helpdesk, Community, Security, Finance, dashboard route guards, API calls, and logout all
   continue using the same authenticated identity.

## Expected behavior

- Access tokens remain in memory; rotating refresh tokens are hashed server-side and delivered in
  an HttpOnly cookie.
- Authentication is established only after the current-user profile and database roles load.
- Startup/refresh shows a neutral loading screen, not protected content or an incorrect redirect.
- Logout clears client state immediately and revokes the current refresh session.
- Frontend guards improve navigation, while backend authorization remains authoritative.
