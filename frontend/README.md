# SocietySync — Frontend

React 19 + Vite web client for the **SocietySync** platform. Provides role-based dashboards and portals for Admins, Residents, Security Personnel, and Staff.

---

## Tech Stack

| Category | Libraries |
|----------|-----------|
| Framework & Core | React 19, React Router v7, Vite |
| Styling & UI | Tailwind CSS v4, shadcn/ui (`@shadcn/react`, `@base-ui/react`), Lucide React Icons |
| Theme & Utilities | next-themes (dark/light mode), clsx, tailwind-merge, class-variance-authority |
| Data & Forms | Zod, date-fns, react-day-picker, input-otp |
| Charts | Recharts |
| HTTP | Axios (with auth interceptors) |
| Notifications | sonner (toast) |
| Linting | ESLint v10, Prettier |

---

## Prerequisites

- **Node.js** `v18.0.0+` (v20+ recommended)
- **npm** `v9.0.0+`
- Backend server running on `http://localhost:8000` (see [`../backend/README.md`](../backend/README.md))

---

## Getting Started

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

> The app proxies API requests to the backend via `VITE_API_URL` (defaults to `http://localhost:8000`).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint across the codebase |

---

## Project Structure

```
frontend/
├── public/                          # Static public assets (favicon, icons)
├── src/
│   ├── api/                         # Axios API client modules
│   │   ├── axiosInstance.js         # Base Axios config, auth interceptors, token refresh
│   │   ├── auth.js                  # signup, loginWithPassword, requestOtp, verifyOtp,
│   │   │                            #   refreshAccessToken, logout, getMe,
│   │   │                            #   initiateGoogleLogin, completeProfile
│   │   ├── analytics.js             # getAdminAnalytics, getAdminAdvancedAnalytics,
│   │   │                            #   getResidentAnalytics, getStaffAnalytics,
│   │   │                            #   downloadAnalyticsExport
│   │   ├── finance.js               # getTransactions, createTransaction
│   │   └── users.js                 # User management calls
│   │
│   ├── context/
│   │   └── AuthContext.jsx          # Global auth state, token storage, auto-refresh
│   │
│   ├── components/                  # Reusable UI components
│   │   └── ui/                      # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   │
│   ├── features/                    # Feature-scoped UI modules (domain logic)
│   │   ├── amenities/               # Amenity browsing & booking UI stubs
│   │   ├── community/               # Notices, events, polls UI stubs
│   │   ├── finance/                 # Finance dashboard components
│   │   ├── helpdesk/                # Complaint filing & tracking UI stubs
│   │   ├── operations/              # Staff operations UI stubs
│   │   ├── realtime/                # Notification bell (static placeholder)
│   │   └── security/                # Visitor & guest pass UI stubs
│   │
│   ├── hooks/                       # Custom React hooks
│   ├── lib/                         # Utility helpers (utils.js, date formatting, etc.)
│   │
│   ├── pages/                       # Full-page components (one per route)
│   │   ├── LandingPage.jsx
│   │   ├── SignInPage.jsx
│   │   ├── SignUpPage.jsx
│   │   ├── CompleteProfile.jsx      # Post-Google-OAuth profile completion
│   │   ├── GoogleAuthSuccess.jsx    # OAuth callback handler
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminFinance.jsx
│   │   ├── AdminHelpdesk.jsx
│   │   ├── AdminSecurity.jsx
│   │   ├── AdminAmenities.jsx
│   │   ├── AdminCommunity.jsx
│   │   ├── AdminAnalytics.jsx
│   │   ├── AdminUserManagement.jsx
│   │   ├── ResidentDashboard.jsx
│   │   ├── ResidentFinancials.jsx
│   │   ├── ResidentHelpdesk.jsx
│   │   ├── ResidentAmenities.jsx
│   │   ├── ResidentCommunity.jsx
│   │   ├── ResidentDigitalID.jsx
│   │   ├── SecurityDashboard.jsx
│   │   ├── StaffDashboard.jsx
│   │   ├── StaffMaintenance.jsx
│   │   ├── StaffOperations.jsx
│   │   ├── StaffInventory.jsx
│   │   └── StaffRoster.jsx
│   │
│   ├── App.jsx                      # Route definitions & layout wrappers
│   ├── App.css                      # Global styles & Tailwind import rules
│   ├── index.css                    # Base CSS reset
│   └── main.jsx                     # React DOM entry point
│
├── components.json                  # shadcn/ui configuration
├── eslint.config.js                 # ESLint flat config
├── jsconfig.json                    # JS path aliases (`@/*` → `src/*`)
├── package.json                     # Dependencies & npm scripts
├── package-lock.json
└── vite.config.js                   # Vite plugins & proxy config
```

---

## Application Portals & Routes

### Public Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | `LandingPage` | Marketing landing page |
| `/signin` | `SignInPage` | Email/password & OTP login |
| `/signup` | `SignUpPage` | New user registration |
| `/auth/google/success` | `GoogleAuthSuccess` | Google OAuth callback |
| `/complete-profile` | `CompleteProfile` | Post-OAuth profile setup |

### Admin Portal (`/admin`)
| Route | Page | Description |
|-------|------|-------------|
| `/admin` | `AdminDashboard` | KPI overview, recent activity |
| `/admin/finance` | `AdminFinance` | Financial transactions & reporting |
| `/admin/helpdesk` | `AdminHelpdesk` | Support ticket management |
| `/admin/security` | `AdminSecurity` | Gate logs & visitor oversight |
| `/admin/amenities` | `AdminAmenities` | Facility booking management |
| `/admin/community` | `AdminCommunity` | Announcements & discussions |
| `/admin/analytics` | `AdminAnalytics` | Platform analytics & reports |
| `/admin/users` | `AdminUserManagement` | User listing & role assignment |

### Resident Portal (`/resident`)
| Route | Page | Description |
|-------|------|-------------|
| `/resident` | `ResidentDashboard` | Personal overview & quick actions |
| `/resident/finance` | `ResidentFinancials` | Maintenance dues & payment receipts |
| `/resident/helpdesk` | `ResidentHelpdesk` | Raise & track complaints |
| `/resident/amenities` | `ResidentAmenities` | Book common facilities |
| `/resident/community` | `ResidentCommunity` | Notices, events & resident forum |
| `/resident/digital-id` | `ResidentDigitalID` | Digital resident ID & QR pass |

### Staff & Security Portal (`/gate`)
| Route | Page | Description |
|-------|------|-------------|
| `/gate` | `SecurityDashboard` | Visitor gate control |
| `/gate/staff` | `StaffDashboard` | Staff personal dashboard |
| `/gate/maintenance` | `StaffMaintenance` | Work orders & maintenance tasks |
| `/gate/operations` | `StaffOperations` | Daily operations checklist |
| `/gate/inventory` | `StaffInventory` | Equipment & supply stock |
| `/gate/roster` | `StaffRoster` | Attendance & duty roster |

---

## API Integration Status

| Module | `src/api/` File | Status |
|--------|----------------|--------|
| Auth | `auth.js` | ✅ Fully integrated |
| Analytics | `analytics.js` | ✅ Fully integrated |
| Finance (legacy) | `finance.js` | ✅ Integrated |
| Users | `users.js` | ⚠️ Partial |
| Finance V1 | _(missing)_ | ❌ Not wired |
| Helpdesk | _(missing)_ | ❌ Not wired |
| Amenities | _(missing)_ | ❌ Not wired |
| Community | _(missing)_ | ❌ Not wired |
| Operations | _(missing)_ | ❌ Not wired |
| Security | _(missing)_ | ❌ Not wired |
| Realtime / Notifications | _(missing)_ | ❌ Not wired |

> See [`pending_integrations.md`](../docs/pending_integrations.md) for a full endpoint-by-endpoint breakdown and priority order.

---

## Authentication Flow

1. **Email + Password** — `POST /auth/login/password` → receives `access_token` (Bearer) + `ss_refresh_token` (HttpOnly cookie)
2. **OTP** — `POST /auth/otp/request` then `POST /auth/otp/verify` → same response shape
3. **Google OAuth** — redirect to `GET /auth/google`, browser returns to `/auth/google/success?pending_token=...`, then `POST /auth/complete-profile`
4. **Token Refresh** — axios interceptor catches 401, calls `POST /auth/refresh` using the HttpOnly cookie, retries the original request automatically
5. **Logout** — `POST /auth/logout` clears the HttpOnly cookie server-side

Auth state is managed globally by `src/context/AuthContext.jsx`.

---

## Related Documentation

- Root Project README: [`../README.md`](../README.md)
- Backend README: [`../backend/README.md`](../backend/README.md)
- Database Design: [`../docs/db_design.md`](../docs/db_design.md)
- OpenAPI Spec: [`../backend/openapi.swagger.yaml`](../backend/openapi.swagger.yaml)
