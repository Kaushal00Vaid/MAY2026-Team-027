# SocietySync — Backend

FastAPI-based REST API server for the SocietySync platform. Provides authentication, role-based access control, and all domain APIs for managing a residential society.

---

## Tech Stack

| Component | Library / Tool |
|-----------|---------------|
| Framework | FastAPI 0.138 |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL 14+ |
| Validation | Pydantic v2 |
| Migrations | Alembic |
| Auth | python-jose (JWT), argon2-cffi (passwords), Twilio (OTP) |
| Background Jobs | APScheduler 3.10 |
| HTTP Server | Uvicorn |
| Testing | pytest, httpx, FastAPI TestClient |
| Package Manager | uv (recommended) or pip |

---

## Prerequisites

- Python **3.12+**
- PostgreSQL **14+** (running locally or remotely)
- `uv` — [install here](https://github.com/astral-sh/uv) _(optional but recommended)_

---

## Setup

### 1. Create & activate virtual environment

```bash
# Using uv (recommended)
uv venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# Or using standard Python
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install dependencies

```bash
uv pip install -r requirements.txt
# or: pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/societysync
SECRET_KEY=your-very-long-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OTP (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. (Optional) Seed the database

```bash
python seed.py
```

### 6. Start the server

```bash
uvicorn app.main:app --reload --port 8000
```

| URL | Description |
|-----|-------------|
| http://localhost:8000 | API root (`GET /` → health check) |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/redoc | ReDoc |
| http://localhost:8000/health | Health endpoint |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app factory, router mounting, middleware
│   ├── dependencies.py          # get_current_user, require_roles dependency factories
│   ├── config.py                # Pydantic-Settings — reads from .env
│   ├── core/
│   │   └── exceptions.py        # Custom HTTP exception classes
│   ├── db/
│   │   ├── database.py          # SQLAlchemy engine & get_db session factory
│   │   └── models/              # ORM model definitions (one file per domain)
│   ├── auth/
│   │   ├── router.py            # /auth/* endpoints
│   │   ├── service.py           # Signup, login, OTP, Google OAuth logic
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── jwt_handler.py       # Token generation & verification
│   │   ├── otp_service.py       # Twilio OTP dispatch & verification
│   │   ├── password.py          # Argon2 hashing
│   │   └── google_oauth.py      # Google OAuth 2.0 flow
│   ├── users/
│   │   ├── router.py            # GET /users/, GET /users/me, PATCH role
│   │   ├── service.py
│   │   └── schemas.py
│   ├── finance/
│   │   ├── router.py            # Legacy /api/finance/transactions
│   │   ├── v1_router.py         # /api/v1/finance/* (ledger, invoices, PDFs)
│   │   ├── service.py
│   │   ├── schemas.py           # TransactionCreate/Response
│   │   ├── contracts.py         # BulkInvoiceCreate, PaymentCreate, ExpenseCreate
│   │   └── operations.py        # late_fee(), money(), simple_pdf(), permission guards
│   ├── helpdesk/
│   │   ├── complaints/
│   │   │   ├── router.py        # /api/v1/complaints/*
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── permissions.py
│   │   ├── work_orders/
│   │   │   ├── router.py        # /api/v1/helpdesk/*
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   └── attachments/
│   │       └── validation.py    # Magic-byte MIME type verification
│   ├── amenities/
│   │   ├── router.py            # /api/v1/amenities/* + /api/v1/bookings/*
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── permissions.py
│   ├── community/
│   │   ├── router.py            # /api/v1/community/*
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── permissions.py
│   ├── operations/
│   │   ├── router.py            # /api/v1/operations/*
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── permissions.py
│   ├── security/
│   │   ├── router.py            # /api/v1/security/*
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── permissions.py
│   ├── analytics/
│   │   ├── router.py            # /api/v1/analytics/*
│   │   └── service.py
│   └── realtime/
│       ├── router.py            # /api/v1/notifications/*, /ws WebSocket
│       ├── service.py
│       ├── schemas.py
│       └── models.py            # WebSocketTicket ORM model
├── alembic/
│   ├── env.py
│   └── versions/               # Migration revision files
├── tests/
│   ├── conftest.py             # Shared pytest fixtures (mock users, TestClient)
│   ├── unit/                   # Pure-Python unit tests — no HTTP, no DB
│   │   ├── auth/               # Google profile completion
│   │   ├── amenities/          # Permissions, schema validation, week_bounds
│   │   ├── community/          # Notice schema, poll validation, permissions
│   │   ├── finance/            # Late fees, money(), PDF, permissions
│   │   ├── helpdesk/           # Complaint permissions & validation (2 files)
│   │   ├── operations/         # Permissions, task/inventory/shift schemas
│   │   ├── realtime/           # Ticket issuance, NotificationPage schema
│   │   └── security/           # PIN digest, guest pass status, gate perms
│   └── integration/            # HTTP-level API tests via FastAPI TestClient
│       ├── auth/               # Signup, login, OTP, refresh, /me
│       ├── users/              # List, /me, patch-role
│       ├── helpdesk/           # Complaints CRUD, comments, work orders
│       ├── finance/            # Legacy + V1 finance endpoints
│       ├── amenities/          # Amenity CRUD, availability, bookings
│       ├── community/          # Notices, events, polls, discussions, directory
│       ├── operations/         # Tasks, inventory, shifts, attendance
│       ├── security/           # Visitors, guest passes, access logs
│       ├── analytics/          # Role-scoped analytics + CSV export
│       └── realtime/           # WebSocket ticket, notifications
├── scheduler.py                # APScheduler background tasks (OTP cleanup, etc.)
├── seed.py                     # Populates DB with sample data
├── main.py                     # Uvicorn entry point
├── requirements.txt
├── alembic.ini
└── openapi.swagger.yaml        # Full OpenAPI 3.0 specification
```

---

## API Modules & Routes

| Module | Prefix | Key Endpoints |
|--------|--------|--------------|
| **Auth** | `/auth` | `POST /signup`, `POST /login/password`, `POST /otp/request`, `POST /otp/verify`, `POST /refresh`, `POST /logout`, `GET /me`, `GET /google`, `POST /complete-profile`, `POST /ws-ticket` |
| **Users** | `/users` | `GET /`, `GET /me`, `PATCH /{id}/role` |
| **Finance (legacy)** | `/api/finance` | `GET /transactions`, `POST /transactions` |
| **Finance V1** | `/api/v1/finance` | `GET /resident-summary`, `GET /admin-summary`, `GET /ledger`, `POST /expenses`, `POST /invoices/bulk`, `POST /payments`, `GET /statement`, `GET /reports/annual-audit` |
| **Complaints** | `/api/v1/complaints` | `POST /`, `GET /`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/escalate`, `POST /{id}/comments`, `GET /{id}/comments`, `GET /{id}/status-history` |
| **Work Orders** | `/api/v1/helpdesk` | `GET /stats`, `GET /assignees`, `GET /known-issues`, `POST /known-issues/{id}/subscribe`, `POST /assistant/analyze`, `GET /maintenance-tasks`, `POST /maintenance-tasks/{id}/complete`, `GET /maintenance-duty`, `PUT /maintenance-duty` |
| **Amenities** | `/api/v1/amenities` | `GET /`, `POST /`, `PATCH /{id}`, `GET /{id}/availability` |
| **Bookings** | `/api/v1/bookings` | `GET /`, `POST /`, `POST /{id}/cancel` |
| **Community** | `/api/v1/community` | `GET/POST /notices`, `POST /notices/{id}/read`, `GET /events`, `PUT /events/{id}/rsvp`, `GET /volunteers`, `POST/DELETE /volunteers/{id}/signup`, `GET /polls/active`, `POST /polls/{id}/votes`, `GET /discussions`, `GET /directory` |
| **Operations** | `/api/v1/operations` | `GET /staff`, `GET/POST /tasks`, `PATCH /tasks/{id}`, `GET/POST /inventory`, `POST /inventory/{id}/movements`, `GET /inventory-export`, `GET/POST /shifts`, `PATCH /shifts/{id}/status`, `GET /shifts/export`, `GET /attendance/today`, `POST /attendance/toggle` |
| **Security** | `/api/v1/security` | `GET /resident-id`, `POST /resident-id/verify`, `GET/POST /visitors`, `POST /visitors/{id}/decision`, `POST /visitors/{id}/entry`, `POST /visitors/{id}/exit`, `GET/POST /guest-passes`, `POST /guest-passes/{id}/revoke`, `POST /guest-passes/verify-pin`, `POST /access-logs/manual-entry`, `GET /access-logs` |
| **Analytics** | `/api/v1/analytics` | `GET /admin`, `GET /resident`, `GET /staff`, `GET /advanced`, `GET /export` |
| **Notifications** | `/api/v1/notifications` | `GET /`, `PATCH /{id}/read`, `POST /read-all` |
| **WebSocket** | `/ws` | `WS /ws?ticket=<token>` |

---

## Running Tests

```bash
# Unit tests — isolated rules, schemas, analytics helpers, and scheduler behavior
uv run python -m pytest tests/unit/ -v

# Integration tests — requires PostgreSQL running with .env configured
uv run python -m pytest tests/integration/ -v

# All tests
uv run python -m pytest tests/ -q --tb=short

# Specific module
uv run python -m pytest tests/integration/auth/ -v
```

### Test Architecture

- **`conftest.py`** — provides 6 role-based `TestClient` fixtures:
  `resident_client`, `admin_client`, `super_admin_client`, `committee_client`, `staff_client`, `unauth_client`
- **Unit tests** — schemas, business logic, analytics helpers, permissions, and scheduler behavior under `tests/unit/`
- **Integration tests** — complete HTTP request/response cycles under `tests/integration/`, organized by API domain; legacy Sprint 1 regressions remain preserved in named regression files
- **`pytest.ini`** — fixes test discovery at `tests/` and declares strict `unit`/`integration` markers for future selective tagging

---

## Database Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Roll back one migration
alembic downgrade -1

# View migration history
alembic history --verbose
```

---

## User Roles

| Role | Value | Description |
|------|-------|-------------|
| Super Admin | `super_admin` | Full platform control |
| Admin | `admin` | Society management |
| Committee Member | `committee_member` | Governance & community |
| Flat Owner | `flat_owner` | Resident (owned unit) |
| Resident Rental | `resident_rental` | Resident (rented unit) |
| Support Staff | `support_staff` | Maintenance/security staff |
