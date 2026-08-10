# Frontend ↔ Backend API Integration Status

> Generated from analysis of `frontend/src/api/`, `frontend/src/features/`, and all backend routers.
> **Status**: Last updated 2026-08-10

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully integrated (frontend API file + UI component) |
| ⚠️ | Partially integrated (API file exists but UI incomplete / endpoint unused) |
| ❌ | Not integrated — backend endpoint exists, no frontend call |

---

## 1. Auth Module (`/auth/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| POST `/auth/signup` | `api/auth.js → signup()` | ✅ | Wired to signup page |
| POST `/auth/register` _(alias)_ | `api/auth.js → signup()` | ✅ | Alias, same function |
| POST `/auth/login/password` | `api/auth.js → loginWithPassword()` | ✅ | Wired to login page |
| POST `/auth/login` _(alias)_ | `api/auth.js → loginWithPassword()` | ✅ | |
| POST `/auth/otp/request` | `api/auth.js → requestOtp()` | ✅ | OTP flow complete |
| POST `/auth/otp/verify` | `api/auth.js → verifyOtp()` | ✅ | |
| POST `/auth/refresh` | `api/auth.js → refreshAccessToken()` | ✅ | Called by axios interceptor |
| POST `/auth/logout` | `api/auth.js → logout()` | ✅ | |
| GET `/auth/me` | `api/auth.js → getMe()` | ✅ | Used by AuthContext |
| GET `/auth/google` | `api/auth.js → initiateGoogleLogin()` | ✅ | Google OAuth redirect |
| POST `/auth/complete-profile` | `api/auth.js → completeProfile()` | ✅ | Post-Google OAuth form |
| POST `/auth/ws-ticket` | ❌ **None** | ❌ | WebSocket ticket not requested in frontend |

---

## 2. Users Module (`/users/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/users/` | `api/users.js` (exists) | ⚠️ | File exists but no confirmed UI usage |
| GET `/users/me` | `api/users.js` | ⚠️ | Likely duplicated with `/auth/me` |
| PATCH `/users/{id}/role` | ❌ **None** | ❌ | Role management UI not built |

---

## 3. Finance Module

### Legacy (`/api/finance/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/finance/transactions` | `api/finance.js → getTransactions()` | ✅ | Wired to Finance Dashboard |
| POST `/api/finance/transactions` | `api/finance.js → createTransaction()` | ✅ | Transaction modal |

### V1 (`/api/v1/finance/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/v1/finance/resident-summary` | ❌ **None** | ❌ | Resident finance summary not wired |
| GET `/api/v1/finance/admin-summary` | ❌ **None** | ❌ | Admin finance summary not wired |
| GET `/api/v1/finance/ledger` | ❌ **None** | ❌ | Transaction ledger page missing |
| POST `/api/v1/finance/expenses` | ❌ **None** | ❌ | Expense creation from admin panel missing |
| POST `/api/v1/finance/invoices/bulk` | ❌ **None** | ❌ | Bulk invoice generation not implemented |
| POST `/api/v1/finance/payments` | ❌ **None** | ❌ | Payment submission not wired |
| GET `/api/v1/finance/statement` | ❌ **None** | ❌ | PDF statement download missing |
| GET `/api/v1/finance/reports/annual-audit` | ❌ **None** | ❌ | Annual audit PDF not linked |

---

## 4. Analytics Module (`/api/v1/analytics/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/v1/analytics/admin` | `api/analytics.js → getAdminAnalytics()` | ✅ | Admin dashboard charts |
| GET `/api/v1/analytics/advanced` | `api/analytics.js → getAdminAdvancedAnalytics()` | ✅ | Advanced analytics panel |
| GET `/api/v1/analytics/resident` | `api/analytics.js → getResidentAnalytics()` | ✅ | Resident dashboard |
| GET `/api/v1/analytics/staff` | `api/analytics.js → getStaffAnalytics()` | ✅ | Staff dashboard |
| GET `/api/v1/analytics/export` | `api/analytics.js → downloadAnalyticsExport()` | ✅ | CSV download wired |

---

## 5. Helpdesk Module (`/api/v1/complaints/*` + `/api/v1/helpdesk/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| POST `/api/v1/complaints` | ❌ **None** | ❌ | No frontend `api/helpdesk.js` file |
| GET `/api/v1/complaints` | ❌ **None** | ❌ | |
| GET `/api/v1/complaints/{id}` | ❌ **None** | ❌ | |
| PATCH `/api/v1/complaints/{id}` | ❌ **None** | ❌ | |
| POST `/api/v1/complaints/{id}/escalate` | ❌ **None** | ❌ | |
| POST `/api/v1/complaints/{id}/comments` | ❌ **None** | ❌ | |
| GET `/api/v1/complaints/{id}/comments` | ❌ **None** | ❌ | |
| GET `/api/v1/complaints/{id}/status-history` | ❌ **None** | ❌ | |
| GET `/api/v1/helpdesk/stats` | ❌ **None** | ❌ | |
| GET `/api/v1/helpdesk/assignees` | ❌ **None** | ❌ | |
| GET `/api/v1/helpdesk/known-issues` | ❌ **None** | ❌ | |
| POST `/api/v1/helpdesk/known-issues/{id}/subscribe` | ❌ **None** | ❌ | |
| POST `/api/v1/helpdesk/assistant/analyze` | ❌ **None** | ❌ | AI assistant not wired |
| GET `/api/v1/helpdesk/maintenance-tasks` | ❌ **None** | ❌ | |
| POST `/api/v1/helpdesk/maintenance-tasks/{id}/complete` | ❌ **None** | ❌ | |
| GET `/api/v1/helpdesk/maintenance-duty` | ❌ **None** | ❌ | |
| PUT `/api/v1/helpdesk/maintenance-duty` | ❌ **None** | ❌ | |

> **Note:** `frontend/src/features/helpdesk/` directory exists but contains only UI stubs with no API calls.

---

## 6. Amenities Module (`/api/v1/amenities/*` + `/api/v1/bookings/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/v1/amenities` | ❌ **None** | ❌ | No frontend `api/amenities.js` file |
| POST `/api/v1/amenities` | ❌ **None** | ❌ | |
| PATCH `/api/v1/amenities/{id}` | ❌ **None** | ❌ | |
| GET `/api/v1/amenities/{id}/availability` | ❌ **None** | ❌ | |
| GET `/api/v1/bookings` | ❌ **None** | ❌ | |
| POST `/api/v1/bookings` | ❌ **None** | ❌ | |
| POST `/api/v1/bookings/{id}/cancel` | ❌ **None** | ❌ | |

> **Note:** `frontend/src/features/amenities/` exists but makes no API calls.

---

## 7. Community Module (`/api/v1/community/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/v1/community/notices` | ❌ **None** | ❌ | No frontend `api/community.js` file |
| POST `/api/v1/community/notices` | ❌ **None** | ❌ | |
| POST `/api/v1/community/notices/{id}/read` | ❌ **None** | ❌ | |
| GET `/api/v1/community/events` | ❌ **None** | ❌ | |
| PUT `/api/v1/community/events/{id}/rsvp` | ❌ **None** | ❌ | |
| GET `/api/v1/community/volunteers` | ❌ **None** | ❌ | |
| POST `/api/v1/community/volunteers/{id}/signup` | ❌ **None** | ❌ | |
| DELETE `/api/v1/community/volunteers/{id}/signup` | ❌ **None** | ❌ | |
| GET `/api/v1/community/polls/active` | ❌ **None** | ❌ | |
| POST `/api/v1/community/polls/{id}/votes` | ❌ **None** | ❌ | |
| GET `/api/v1/community/discussions` | ❌ **None** | ❌ | |
| GET `/api/v1/community/directory` | ❌ **None** | ❌ | |

> **Note:** `frontend/src/features/community/` exists but makes no API calls.

---

## 8. Operations Module (`/api/v1/operations/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/v1/operations/staff` | ❌ **None** | ❌ | No frontend `api/operations.js` file |
| GET `/api/v1/operations/tasks` | ❌ **None** | ❌ | |
| POST `/api/v1/operations/tasks` | ❌ **None** | ❌ | |
| PATCH `/api/v1/operations/tasks/{id}` | ❌ **None** | ❌ | |
| GET `/api/v1/operations/inventory` | ❌ **None** | ❌ | |
| POST `/api/v1/operations/inventory` | ❌ **None** | ❌ | |
| POST `/api/v1/operations/inventory/{id}/movements` | ❌ **None** | ❌ | |
| GET `/api/v1/operations/inventory-export` | ❌ **None** | ❌ | |
| GET `/api/v1/operations/inventory-options` | ❌ **None** | ❌ | |
| GET `/api/v1/operations/shifts` | ❌ **None** | ❌ | |
| POST `/api/v1/operations/shifts` | ❌ **None** | ❌ | |
| PATCH `/api/v1/operations/shifts/{id}/status` | ❌ **None** | ❌ | |
| GET `/api/v1/operations/shifts/export` | ❌ **None** | ❌ | |
| GET `/api/v1/operations/attendance/today` | ❌ **None** | ❌ | |
| POST `/api/v1/operations/attendance/toggle` | ❌ **None** | ❌ | |

> **Note:** `frontend/src/features/operations/` exists but makes no API calls.

---

## 9. Security Module (`/api/v1/security/*`)

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| GET `/api/v1/security/resident-id` | ❌ **None** | ❌ | No frontend `api/security.js` file |
| POST `/api/v1/security/resident-id/verify` | ❌ **None** | ❌ | |
| GET `/api/v1/security/visitors` | ❌ **None** | ❌ | |
| POST `/api/v1/security/visitors` | ❌ **None** | ❌ | |
| POST `/api/v1/security/visitors/{id}/decision` | ❌ **None** | ❌ | |
| POST `/api/v1/security/visitors/{id}/entry` | ❌ **None** | ❌ | |
| POST `/api/v1/security/visitors/{id}/exit` | ❌ **None** | ❌ | |
| GET `/api/v1/security/guest-passes` | ❌ **None** | ❌ | |
| POST `/api/v1/security/guest-passes` | ❌ **None** | ❌ | |
| POST `/api/v1/security/guest-passes/{id}/revoke` | ❌ **None** | ❌ | |
| POST `/api/v1/security/guest-passes/verify-pin` | ❌ **None** | ❌ | |
| POST `/api/v1/security/access-logs/manual-entry` | ❌ **None** | ❌ | |
| GET `/api/v1/security/access-logs` | ❌ **None** | ❌ | |

> **Note:** `frontend/src/features/security/` exists but makes no API calls.

---

## 10. Realtime / Notifications Module

| Endpoint | Frontend Call | Status | Notes |
|----------|--------------|--------|-------|
| POST `/auth/ws-ticket` | ❌ **None** | ❌ | WS ticket not requested |
| GET `/api/v1/notifications` | ❌ **None** | ❌ | No frontend `api/realtime.js` or `api/notifications.js` |
| PATCH `/api/v1/notifications/{id}/read` | ❌ **None** | ❌ | |
| POST `/api/v1/notifications/read-all` | ❌ **None** | ❌ | |
| WS `/ws?ticket=…` | ❌ **None** | ❌ | WebSocket not connected in frontend |

> **Note:** `frontend/src/features/realtime/` exists with a notification bell UI component, but it fetches no live data — it shows hardcoded placeholders.

---

## Summary

| Module | Total Endpoints | ✅ Integrated | ⚠️ Partial | ❌ Missing |
|--------|----------------|--------------|------------|-----------|
| Auth | 12 | 11 | 0 | 1 |
| Users | 3 | 0 | 2 | 1 |
| Finance (legacy) | 2 | 2 | 0 | 0 |
| Finance V1 | 8 | 0 | 0 | 8 |
| Analytics | 5 | 5 | 0 | 0 |
| Helpdesk | 17 | 0 | 0 | 17 |
| Amenities | 7 | 0 | 0 | 7 |
| Community | 12 | 0 | 0 | 12 |
| Operations | 15 | 0 | 0 | 15 |
| Security | 13 | 0 | 0 | 13 |
| Realtime | 5 | 0 | 0 | 5 |
| **Total** | **99** | **18** | **2** | **79** |

---

## Priority Order for Integration Work

### 🔴 High Priority (user-visible features already in UI as stubs)
1. **Helpdesk** — Complaints filing, listing, and commenting (core user flow)
2. **Security** — Visitor management and guest passes (gate operations)
3. **Community** — Notices, events, polls (dashboard home content)

### 🟡 Medium Priority (feature-complete backend, UI foundation exists)
4. **Amenities** — Booking flow (residents blocked from using amenities)
5. **Operations** — Task and attendance management (staff workflow)
6. **Finance V1** — Ledger, invoices, payments (replace placeholder finance data)

### 🟢 Low Priority (infrastructure / supplementary)
7. **Realtime** — WebSocket connection + live notifications
8. **Users** — Role management (admin-only, rarely used)

---

## Files to Create on Frontend (per integration priority)

```
frontend/src/api/
├── helpdesk.js       ← complaints, comments, status-history, work-orders
├── security.js       ← visitors, guest-passes, access-logs, resident-id
├── community.js      ← notices, events, volunteers, polls, discussions, directory
├── amenities.js      ← amenities CRUD, availability, bookings
├── operations.js     ← tasks, inventory, shifts, attendance
├── notifications.js  ← notifications CRUD, ws-ticket
└── financeV1.js      ← ledger, invoices, payments, statements (extends finance.js)
```
