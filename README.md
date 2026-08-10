# SocietySync

## Project Structure
MAY2026-Team-027/ \
├── backend/ \
│   ├── db/ \
│   │   ├── database.py \
│   │   └── models.py \
│   ├── venv/ \
│   ├── main.py \
│   └── requirements.txt \
├── docs/ \
│   ├── database_design.md \
│   ├── erd.mermaid \
│   └── schema.sql \
├── frontend/ \
│   ├── node_modules/ \
│   ├── public/ \
│   ├── src/ \
│   ├── .gitignore \
│   ├── eslint.config.js \
│   ├── index.html \
│   ├── package-lock.json \
│   ├── package.json \
│   ├── README.md \
│   └── vite.config.js \
├── .gitignore \
└── README.md

## Project Setup: Frontend & Backend

This document outlines the local development setup for both the React frontend and the FastAPI backend.

### Frontend (React + Vite)

The frontend is built with React, bundled by Vite, and uses Zod for data validation.

#### Prerequisites
* Node.js (v18+ recommended)
* npm or yarn

#### Setup Instructions
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Backend (FastAPI + PostgreSQL)

The backend is built with FastAPI, uses Pydantic for data validation, and connects to a PostgreSQL database.

#### Prerequisites
* Python 3.10+
* PostgreSQL installed and running locally

#### Setup Instructions
1. Navigate to the backend directory:
    ```bash
    cd backend
    python -m venv venv
    OR
    uv venv venv
    ```
2. Activate your virtual environment:
* Windows: venv\Scripts\activate
* Mac/Linux: source venv/bin/activate
3. Install the required Python packages:
    ```bash
    pip install fastapi "uvicorn[standard]" pydantic sqlalchemy psycopg2-binary ruff
    OR
    uv pip install fastapi "uvicorn[standard]" pydantic sqlalchemy psycopg2-binary ruff
    ```
4. Start the FastAPI development server:
    ```bash
    uvicorn main:app --reload
    ```

### Scheduled worker

Scheduled work runs as a separate long-lived process and must not be embedded in
the web server. After applying Alembic migrations, start exactly one worker
service per environment from the `backend` directory:

```bash
.venv/bin/python scheduler.py
```

The worker performs targeted notice fan-out, invoice overdue processing and
payment reminders, visitor/pass expiry, and amenity booking completion. Jobs use
PostgreSQL advisory locks, so an accidentally duplicated worker skips overlapping
runs safely. Configure its timezone, retry policy, intervals, late fee, startup
catch-up, and misfire grace period with the `SCHEDULER_*` variables documented in
`backend/.env.example`.

In production, supervise the process independently from Uvicorn and configure
automatic restart plus log collection. Readiness should only be declared after
`alembic upgrade head` succeeds; the worker exits job attempts visibly on database
errors so monitoring can alert on `job_failed`, `job_error`, or `job_missed` logs.
