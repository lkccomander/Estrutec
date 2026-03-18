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

The backend expects a database connection string and app settings. Use `backend/.env.example` as reference and adapt it to your environment.

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

## CI/CD

This repository now includes GitHub Actions workflows for validation and Railway deployment.

### Continuous Integration

The `CI` workflow runs on pushes to `main` and on pull requests. It validates:

- frontend linting with `npm run lint`
- frontend production build with `npm run build`
- backend SQL integration tests against a temporary PostgreSQL service
- backend API smoke tests with `pytest`

You can run the SQL checks locally with:

```bash
bash scripts/run_sql_tests.sh
```

Make sure `DATABASE_URL` is configured before running the script.

### Continuous Deployment

Two deployment workflows are included:

- `Deploy Backend`
- `Deploy Frontend`

Both deploy workflows run automatically after `CI` succeeds on `main`, and can also be triggered manually from GitHub Actions.

Required GitHub Actions secrets:

- `RAILWAY_TOKEN`
- `RAILWAY_BACKEND_SERVICE`
- `RAILWAY_FRONTEND_SERVICE`

Recommended Railway setup:

1. Create one Railway project with separate services for `backend` and `frontend`.
2. Keep environment variables configured directly in Railway per service.
3. Set the backend service root to `backend` and the frontend service root to `frontend` if you also use Railway's GitHub integration.

Backend deployment notes:

- Railway config file: `backend/railway.json`
- Required Railway variables: `DATABASE_URL`, `JWT_SECRET_KEY`, and any other backend secrets
- The deploy uses a `preDeployCommand` to run startup migrations before the API becomes active

Frontend deployment notes:

- Railway config file: `frontend/railway.json`
- Required Railway variable: `VITE_API_URL`
- Set `VITE_API_URL` to your backend public URL, for example `https://your-backend.up.railway.app`
- Add the frontend public URL to the backend `CORS_ORIGINS`, for example `https://your-frontend.up.railway.app`
- The frontend is built during deploy and served from the custom Docker image

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
