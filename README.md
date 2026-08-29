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

## Local Development Setup

### Prerequisites

| Tool       | Supported version | Check                                |
| ---------- | ----------------- | ------------------------------------ |
| Python     | 3.12+             | `python --version` or `py --version` |
| Node.js    | 20.19+ or 22.12+  | `node --version`                     |
| npm        | 9+                | `npm --version`                      |
| SQLite     | Bundled with Python | `python -c "import sqlite3; print(sqlite3.sqlite_version)"` |
| PostgreSQL | 14+ (optional)   | `psql --version`                     |
| Git        | Current stable    | `git --version`                      |

The commands below assume the repository has been cloned and the terminal is at
the repository root. `uv` is optional; the documented commands use standard
Python and `pip` so they work on a clean installation.

### 1. Choose a database

SQLite is the default for local development. It starts as a file in `backend/`
and does not need a database server. PostgreSQL remains supported for shared,
staging, and production environments.

### Optional: create a PostgreSQL database

Start PostgreSQL, then create a database and user. Existing PostgreSQL credentials
may be used instead.

Ubuntu/Linux:

```bash
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

Windows PowerShell (after installing PostgreSQL and adding `psql` to `PATH`):

```powershell
psql -U postgres
```

Run the following inside `psql` on either operating system:

```sql
CREATE USER societysync WITH PASSWORD 'change-this-password';
CREATE DATABASE societysync OWNER societysync;
\q
```

### 2. Set up the backend

Ubuntu/Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

Windows PowerShell:

```powershell
Set-Location backend
py -3.12 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

For Windows Command Prompt, activate with `.venv\Scripts\activate.bat` and copy
the environment file with `copy .env.example .env`.

Edit `backend/.env` and set at least:

```env
# Default local database (no server required)
DATABASE_URL=sqlite:///./societysync_local.db

# PostgreSQL alternative
# DATABASE_URL=postgresql://societysync:change-this-password@localhost:5432/societysync
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development

# Required only for the Resident Helpdesk chatbot
AIPIPE_API_KEY=your-ai-pipe-token
AIPIPE_PROVIDER=auto
AIPIPE_OPENAI_MODEL=gpt-5-nano
AIPIPE_OPENROUTER_MODEL=openai/gpt-5-nano
AIPIPE_GEMINI_MODEL=gemini-2.5-flash-lite
```

Keep `.env` private. Never place `AIPIPE_API_KEY`, database passwords, or JWT
secrets in frontend variables or commit them to Git.

For SQLite, the API creates the local schema when it starts. Load demo data
while the backend virtual environment is active:

```bash
python seed.py
```

For PostgreSQL, apply migrations before running the API or scheduler, then seed
only if demo data is wanted:

```bash
python -m alembic upgrade head
python seed.py
```

### 3. Set up the frontend

Continue from the `backend` directory used above. The npm commands are the same
in Bash, PowerShell, and Command Prompt:

```bash
cd ../frontend
npm install
```

The frontend uses `http://localhost:8000` by default. If the backend uses another
port, create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Restart Vite after changing a frontend environment variable.

### 4. Run the application

The API, scheduler, and frontend are separate long-running processes. Open three
terminals and keep all three running.

Ubuntu/Linux:

Terminal 1 — backend API:

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — scheduler:

```bash
cd backend
source .venv/bin/activate
python scheduler.py
```

Terminal 3 — frontend:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Windows PowerShell:

Terminal 1 — backend API:

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 — scheduler:

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
python scheduler.py
```

Terminal 3 — frontend:

```powershell
Set-Location frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open these URLs after startup:

| Service                   | URL                          |
| ------------------------- | ---------------------------- |
| Web application           | http://localhost:5173        |
| Backend health check      | http://localhost:8000/health |
| Swagger API documentation | http://localhost:8000/docs   |

Run only one scheduler instance per environment. Its database advisory locks
prevent duplicate job execution, but a single dedicated process is the intended
deployment model. Stop any development process with `Ctrl+C`.

### 5. Common startup problems

- **Frontend cannot reach the API:** confirm `/health` works, `VITE_API_URL` uses
  the API's actual port, and `FRONTEND_URL` exactly matches the browser origin.
- **Environment changes do not apply:** restart the backend after changing
  `backend/.env`; restart Vite after changing `frontend/.env.local`.
- **Database connection refused:** start PostgreSQL and verify `DATABASE_URL`.
- **`alembic` or imports not found:** activate `backend/.venv` and run commands
  from the `backend` directory.
- **PowerShell blocks activation:** run
  `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal.
- **Port already in use:** stop the existing process or use another port and set
  the matching `VITE_API_URL`.

---

## Running Tests

Activate the backend virtual environment first, then run from `backend`:

```bash
cd backend

# Unit tests only (no database required)
python -m pytest tests/unit/ -v

# Integration tests (requires running PostgreSQL & .env configured)
python -m pytest tests/integration/ -v

# Full test suite
python -m pytest tests/ -v

# Run with short output
python -m pytest tests/ -q --tb=short

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

| Module     | Base Path                                    | Description                                                  |
| ---------- | -------------------------------------------- | ------------------------------------------------------------ |
| Auth       | `/auth/*`                                    | Signup, login (password + OTP + Google OAuth), token refresh |
| Users      | `/users/*`                                   | User listing & role management                               |
| Finance    | `/api/finance/*`, `/api/v1/finance/*`        | Transactions, invoices, ledger, PDF reports                  |
| Helpdesk   | `/api/v1/complaints/*`, `/api/v1/helpdesk/*` | Complaints, comments, work orders                            |
| Amenities  | `/api/v1/amenities/*`, `/api/v1/bookings/*`  | Amenity config & slot bookings                               |
| Community  | `/api/v1/community/*`                        | Notices, events, polls, discussions, directory               |
| Operations | `/api/v1/operations/*`                       | Staff tasks, inventory, shifts, attendance                   |
| Security   | `/api/v1/security/*`                         | Visitors, guest passes, access logs                          |
| Analytics  | `/api/v1/analytics/*`                        | Role-scoped dashboards & CSV export                          |
| Realtime   | `/api/v1/notifications/*`, `/ws`             | Push notifications & WebSocket                               |

Full OpenAPI spec: [`backend/openapi.swagger.yaml`](backend/openapi.swagger.yaml)

---

## User Roles

| Role               | Access                                                      |
| ------------------ | ----------------------------------------------------------- |
| `super_admin`      | Full platform access including user role management         |
| `admin`            | Society management, finance, analytics, helpdesk oversight  |
| `committee_member` | Notices, events, finance reporting, helpdesk management     |
| `flat_owner`       | Resident portal — complaints, bookings, community, payments |
| `resident_rental`  | Same as flat_owner                                          |
| `support_staff`    | Operations, attendance, maintenance tasks, gate access      |

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

| Document                                                       | Description                        |
| -------------------------------------------------------------- | ---------------------------------- |
| [`docs/db_design.md`](docs/db_design.md)                       | Full database schema documentation |
| [`docs/schema.sql`](docs/schema.sql)                           | SQL DDL for all tables             |
| [`docs/er.png`](docs/er.png)                                   | Entity-Relationship diagram        |
| [`backend/openapi.swagger.yaml`](backend/openapi.swagger.yaml) | OpenAPI 3.0 specification          |
| [`frontend/README.md`](frontend/README.md)                     | Frontend setup & architecture      |
| [`backend/README.md`](backend/README.md)                       | Backend setup & architecture       |

---

## Environment Variables

All supported backend settings and safe defaults are listed in
[`backend/.env.example`](backend/.env.example). Copy it to the ignored
`backend/.env` file and change values for the target environment. The most
important groups are database, JWT, application/CORS, AI Pipe, scheduler,
Twilio, and Google OAuth settings.

The frontend has one optional build-time setting: `VITE_API_URL`. Put it in the
ignored `frontend/.env.local` file when the API is not running at
`http://localhost:8000`. Values prefixed with `VITE_` are visible in the browser
and must never contain secrets.
