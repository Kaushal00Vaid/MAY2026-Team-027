# Frontend ↔ Backend API Integration Status

The implemented SocietySync product workflows are connected to the FastAPI backend through the shared Axios instance in `frontend/src/api/axiosInstance.js`. Authentication, refresh-token cookies, and access-token injection are centralized there and in `AuthContext`.

## Integrated domains

| Domain | Frontend client | Backend routes | Product consumers |
|--------|-----------------|----------------|-------------------|
| Authentication | `src/api/auth.js` | `/auth/*` | Sign in, sign up, OAuth completion, session refresh |
| Users | `src/api/users.js` | `/users/*` | Account and admin user management |
| Analytics | `src/api/analytics.js` | `/api/v1/analytics/*` | Admin, resident, staff, and advanced analytics dashboards |
| Legacy finance | `src/api/finance.js` | `/api/finance/*` | Admin dashboard transaction feed |
| Finance V1 | `src/features/finance/api.js` | `/api/v1/finance/*` | Resident and admin finance pages, receipts and reports |
| Helpdesk | `src/features/helpdesk/api.js` | `/api/v1/complaints/*`, `/api/v1/helpdesk/*` | Resident complaints, admin helpdesk, staff maintenance |
| Amenities | `src/features/amenities/api.js` | `/api/v1/amenities/*`, `/api/v1/bookings/*` | Resident bookings and admin scheduling |
| Community | `src/features/community/api.js` | `/api/v1/community/*` | Notices, events, polls, volunteers, discussions, directory |
| Operations | `src/features/operations/api.js` | `/api/v1/operations/*` | Staff tasks, inventory, roster, attendance, CSV exports |
| Security | `src/features/security/api.js` | `/api/v1/security/*` | Gate workflow, visitors, guest passes, resident ID, access logs |
| Realtime | `src/features/realtime/api.js` | `/auth/ws-ticket`, `/api/v1/notifications/*`, `/ws` | Notification menu and live refresh |

## Verification

- Backend unit tests are under `backend/tests/unit/`.
- Backend HTTP integration tests are under `backend/tests/integration/` and cover every API domain.
- Frontend API route contracts are under `frontend/tests/unit/api/`.
- Rendered frontend/API interaction tests are under `frontend/tests/integration/pages/`.

Run the independent suites with:

```bash
cd backend
.venv/bin/python -m pytest tests/unit -q
.venv/bin/python -m pytest tests/integration -q

cd ../frontend
npm run test:unit
npm run test:integration
```

## Intentional boundaries

- Google OAuth initiation and callback navigation are browser/server redirect flows rather than ordinary Axios calls.
- `/ws` is consumed by `RealtimeContext`; ticket creation uses `/auth/ws-ticket` before the socket opens.
- Download endpoints return blobs and are consumed through client-side save helpers.
- API clients may expose low-level operations such as expense creation and resident-ID verification before a dedicated UI control is added; their route contracts are tested so future screens can use them safely.
