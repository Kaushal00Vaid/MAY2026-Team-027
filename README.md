# SocietySync

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