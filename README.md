# SocietySync

> A full-stack housing society and community management platform built with **FastAPI** (backend) and **React 19 + Vite** (frontend).

---

## Project Structure

```
MAY2026-Team-027/
├── backend/                        # FastAPI backend (Python 3.12)
│   ├── app/                        # Application source
│   │   ├── main.py                 # FastAPI app factory & router registry
│   │   ├── dependencies.py         # JWT auth & role-based access guards
│   │   ├── config.py               # Environment settings (Pydantic-Settings)
│   │   ├── auth/                   # Signup, login, OTP, Google OAuth, JWT
│   │   ├── users/                  # User listing & role management
│   │   ├── finance/                # Transactions, invoices, ledger, PDFs
│   │   ├── helpdesk/               # Complaints, comments, work orders
│   │   │   ├── complaints/         # Resident complaint CRUD & escalation
│   │   │   ├── work_orders/        # Staff maintenance tasks & duty state
│   │   │   └── attachments/        # File upload validation
│   │   ├── amenities/              # Amenity management & slot bookings
│   │   ├── community/              # Notices, events, polls, discussions
│   │   ├── operations/             # Staff tasks, inventory, shifts, attendance
│   │   ├── security/               # Visitors, guest passes, access logs
│   │   ├── analytics/              # Role-scoped dashboards & CSV export
│   │   ├── realtime/               # WebSocket notifications & ticket issuance
│   │   ├── core/                   # Shared exceptions & utilities
│   │   └── db/                     # SQLAlchemy engine, session, ORM models
│   ├── alembic/                    # Database migration scripts
│   ├── tests/                      # Test suite
│   │   ├── conftest.py             # Shared pytest fixtures & mock users
│   │   ├── unit/                   # Pure-Python unit tests (no DB/HTTP)
│   │   │   ├── auth/
│   │   │   ├── amenities/
│   │   │   ├── community/
│   │   │   ├── finance/
│   │   │   ├── helpdesk/
│   │   │   ├── operations/
│   │   │   ├── realtime/
│   │   │   └── security/
│   │   └── integration/            # HTTP-level API tests via TestClient
│   │       ├── auth/
│   │       ├── users/
│   │       ├── helpdesk/
│   │       ├── finance/
│   │       ├── amenities/
│   │       ├── community/
│   │       ├── operations/
│   │       ├── security/
│   │       ├── analytics/
│   │       └── realtime/
│   ├── scheduler.py                # APScheduler background jobs
│   ├── seed.py                     # Database seeding script
│   ├── main.py                     # Uvicorn entry point
│   ├── requirements.txt            # Python dependencies
│   ├── alembic.ini                 # Alembic configuration
│   ├── openapi.swagger.yaml        # Generated OpenAPI spec
│   ├── .env.example                # Environment variable template
│   └── .env                        # Local environment variables (git-ignored)
├── frontend/                       # React 19 + Vite frontend
│   ├── public/                     # Static public assets
│   ├── src/
│   │   ├── api/                    # Axios API client modules
│   │   │   ├── axiosInstance.js    # Base axios config + auth interceptors
│   │   │   ├── auth.js             # Auth endpoints (signup, login, OTP, OAuth)
│   │   │   ├── analytics.js        # Analytics dashboard endpoints
│   │   │   ├── finance.js          # Finance transaction endpoints
│   │   │   └── users.js            # User management endpoints
│   │   ├── context/                # React context providers (AuthContext)
│   │   ├── components/             # Reusable UI components (shadcn/ui)
│   │   ├── features/               # Feature-scoped UI modules
│   │   │   ├── amenities/
│   │   │   ├── community/
│   │   │   ├── finance/
│   │   │   ├── helpdesk/
│   │   │   ├── operations/
│   │   │   ├── realtime/
│   │   │   └── security/
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utility helpers
│   │   ├── pages/                  # Full page components (one per route)
│   │   ├── App.jsx                 # Route definitions
│   │   └── main.jsx                # React entry point
│   ├── package.json
│   ├── tests/
│   │   ├── unit/                   # API clients, hooks, and isolated components
│   │   └── integration/            # Rendered page/API interaction tests
│   └── vite.config.js
├── docs/                           # Architecture & design documentation
│   ├── db_design.md                # Database schema design document
│   ├── er-dbml.txt                 # ER diagram in DBML format
│   ├── er.png / er.svg             # Entity-Relationship diagram
│   ├── schema.sql                  # Full SQL DDL
│   ├── amenities/
│   ├── authentication-and-authorization/
│   ├── community/
│   ├── finance/
│   ├── helpdesk/
│   ├── realtime/
│   ├── security-and-access/
│   └── staff-operations/
├── .gitignore
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node.js | 18+ (20+ recommended) |
| PostgreSQL | 14+ |
| `uv` (optional) | latest — [install](https://github.com/astral-sh/uv) |

---

### Backend Setup

```bash
cd backend

# 1. Create virtual environment
uv venv
# or: python -m venv .venv

# 2. Activate
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 3. Install dependencies
uv pip install -r requirements.txt
# or: pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and fill in DATABASE_URL, SECRET_KEY, etc.

# 5. Run database migrations
alembic upgrade head

# 6. (Optional) Seed initial data
python seed.py

# 7. Start the development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at: **http://localhost:8000**
Interactive docs (Swagger UI): **http://localhost:8000/docs**

---

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

The app will be available at: **http://localhost:5173**

> **Note:** The frontend expects the backend at `http://localhost:8000`. This is configured in `frontend/src/api/axiosInstance.js` via the `VITE_API_URL` environment variable.

---

## Running Tests

```bash
cd backend

# Unit tests only (no database required)
uv run python -m pytest tests/unit/ -v

# Integration tests (requires running PostgreSQL & .env configured)
uv run python -m pytest tests/integration/ -v

# Full test suite
uv run python -m pytest tests/ -v

# Run with short output
uv run python -m pytest tests/ -q --tb=short

cd ../frontend

# Frontend unit and integration suites
npm run test:unit
npm run test:integration

# All frontend tests, lint, and production compilation
npm test
npm run lint
npm run build
```

---

## API Overview

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/auth/*` | Signup, login (password + OTP + Google OAuth), token refresh |
| Users | `/users/*` | User listing & role management |
| Finance | `/api/finance/*`, `/api/v1/finance/*` | Transactions, invoices, ledger, PDF reports |
| Helpdesk | `/api/v1/complaints/*`, `/api/v1/helpdesk/*` | Complaints, comments, work orders |
| Amenities | `/api/v1/amenities/*`, `/api/v1/bookings/*` | Amenity config & slot bookings |
| Community | `/api/v1/community/*` | Notices, events, polls, discussions, directory |
| Operations | `/api/v1/operations/*` | Staff tasks, inventory, shifts, attendance |
| Security | `/api/v1/security/*` | Visitors, guest passes, access logs |
| Analytics | `/api/v1/analytics/*` | Role-scoped dashboards & CSV export |
| Realtime | `/api/v1/notifications/*`, `/ws` | Push notifications & WebSocket |

Full OpenAPI spec: [`backend/openapi.swagger.yaml`](backend/openapi.swagger.yaml)

---

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Full platform access including user role management |
| `admin` | Society management, finance, analytics, helpdesk oversight |
| `committee_member` | Notices, events, finance reporting, helpdesk management |
| `flat_owner` | Resident portal — complaints, bookings, community, payments |
| `resident_rental` | Same as flat_owner |
| `support_staff` | Operations, attendance, maintenance tasks, gate access |

---

## Tech Stack

### Backend
- **FastAPI** 0.138 — async REST API framework
- **SQLAlchemy** 2.0 — ORM with PostgreSQL
- **Pydantic** 2 — schema validation
- **Alembic** — database migrations
- **python-jose** — JWT tokens
- **Twilio** — OTP SMS delivery
- **APScheduler** — background scheduled jobs
- **pytest** + **httpx** — test suite

### Frontend
- **React 19** + **Vite** — UI framework & build tool
- **React Router v7** — client-side routing
- **Tailwind CSS v4** + **shadcn/ui** — styling & component library
- **Recharts** — data visualisations
- **Axios** — HTTP client with interceptors
- **Zod** — runtime schema validation

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/db_design.md`](docs/db_design.md) | Full database schema documentation |
| [`docs/schema.sql`](docs/schema.sql) | SQL DDL for all tables |
| [`docs/er.png`](docs/er.png) | Entity-Relationship diagram |
| [`backend/openapi.swagger.yaml`](backend/openapi.swagger.yaml) | OpenAPI 3.0 specification |
| [`frontend/README.md`](frontend/README.md) | Frontend setup & architecture |
| [`backend/README.md`](backend/README.md) | Backend setup & architecture |

---

## Environment Variables

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env` and fill in:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/societysync
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:5173
```
