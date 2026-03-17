# Estrutec Expenses

Estrutec Expenses is a full-stack expense management system for handling projects, budgets, receipts, approvals, attachments, and budget movements.

The repository includes:

- A FastAPI backend
- A React + Vite frontend
- PostgreSQL schema and migration scripts
- Project notes and architecture documents

## Features

- User authentication and role-based access
- Project management with archive/reactivate flow
- Multiple budgets per project
- Receipt registration and approval workflow
- Support for budget funding through `CAJA_CHICA`
- Attachment management for receipts
- Automatic startup database migrations
- Excel export for approved receipts
- Modular dashboard-based frontend

## Tech Stack

- Backend: FastAPI, psycopg, python-jose, passlib, argon2
- Frontend: React 19, TypeScript, Vite, react-icons, xlsx
- Database: PostgreSQL

## Repository Structure

```text
.
|-- backend/          FastAPI application
|-- frontend/         React + Vite application
|-- DATABASE/         Baseline SQL, migrations, grants, and SQL tests
|-- assets/           Project visual assets
|-- ARQUITECTURA/     Architecture notes
|-- project_brain/    Product, technical, and decision notes
```

## Requirements

- Python 3.11+ recommended
- Node.js 18+ recommended
- PostgreSQL 14+ recommended

## Backend Setup

1. Go to the backend folder:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv .venv
```

3. Activate it.

Windows:

```bash
.venv\Scripts\activate
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Configure environment variables.

The backend expects a database connection string and app settings. Review the local `.env` file in `backend/` and adapt it to your environment.

6. Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend Setup

1. Go to the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables.

Use `frontend/.env.example` as reference for the frontend API URL.

4. Start the development server:

```bash
npm run dev -- --host 0.0.0.0
```

## Run Both on Windows

This repository includes helper batch files:

- `ini.bat`: starts the backend
- `ininpm.bat`: starts the frontend
- `iniciar_todo.bat`: restarts both services and launches them in separate terminals

## Database Notes

The backend runs startup migrations automatically when FastAPI starts.

Current behavior:

- `DATABASE/DB.SQL` is executed on startup
- SQL files in `DATABASE/migrations/` are applied once
- Applied migrations are tracked in `app_migration_log`

Make sure the PostgreSQL user in your backend configuration has enough privileges to:

- create tables
- alter schema objects
- execute functions and triggers

## Main Domain Flow

1. Users authenticate into the system.
2. Projects are the main entry point.
3. Each project can contain multiple budgets.
4. Receipts are registered against a budget.
5. Approvals and rejections are handled through database-backed business rules.
6. Budget movements are recorded for auditability.

## API Modules

The backend currently exposes routes for:

- auth
- users
- projects
- budgets
- receipts
- attachments
- health

## Frontend Notes

The frontend is organized around dashboards and feature modules:

- `projects`
- `budgets`
- `users`
- `icons`

The authenticated flow starts in the budgets domain, with projects as the main entry point before drilling down into individual budgets.

## Development Notes

- Business-critical approval logic is centralized in PostgreSQL functions.
- Budget and receipt currencies are explicitly modeled.
- Exchange rates are supported when receipt currency differs from budget currency.
- Project archiving is supported to keep historical records without cluttering active operations.

## Documentation

Additional internal documentation is available in:

- `ARQUITECTURA/arquitectura.md`
- `project_brain/decision.md`
- `project_brain/agents.md`
- `project_brain/skills.md`
- `project_brain/umldiagrams.md`

## License

No repository-wide license has been defined yet.
