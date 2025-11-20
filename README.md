# telemedicine

Comprehensive developer README for running the telemedicine platform (frontend + backend).

Table of contents

- Project overview
- Prerequisites
- Backend (Django) — setup & run
- Frontend (React) — setup & run
- Environment variables & configuration
- Running both servers (development)
- Tests
- CI / Deploy notes
- Troubleshooting
- Contributing

Project overview
This repository contains a Django backend (REST API) and a React single-page frontend.
The app provides role-based dashboards (patients, doctors, caregivers), appointment and medication features, and a scaffold for video consultations (ZegoCloud-ready).

Prerequisites

- Python 3.10+ (3.8+ usually OK; match `requirements.txt`).
- Node.js 16+ and `npm`.
- Git (repo cloned locally).
- Windows PowerShell (examples below use PowerShell).

Backend (Django) — setup & run

1. Open PowerShell and switch to the backend folder:

```powershell
cd .\\backend
```

2. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate
```

3. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

4. Provide environment variables (see "Environment variables" below). A simple local workflow is to create a `.env` file in `backend/` and load it (or set variables in the shell).

5. Run migrations and create an admin user:

```powershell
python manage.py migrate
python manage.py createsuperuser
```

6. Start the development server (default port 8000):

```powershell
python manage.py runserver
```

Backend notes

- The repo uses SQLite by default (`db.sqlite3`). For production use, configure a managed DB (Postgres, MySQL) and update `DATABASES` settings or provide `DATABASE_URL`.
- If the backend expects environment variables via a `.env` loader (e.g., django-environ), ensure that dependency is installed or set vars in your shell before running.

Frontend (React) — setup & run

1. Open a second PowerShell window and change to the frontend directory:

```powershell
cd .\\frontend
```

2. Install node modules:

```powershell
npm install
```

3. Provide frontend environment variables (see "Environment variables" below). Create a `.env.development` or `.env` file in `frontend/` containing `REACT_APP_...` variables.

4. Start the dev server (default port 3000):

```powershell
npm start
```

5. To create a production build:

```powershell
npm run build
```

Frontend notes

- The React app expects the API to be reachable (typically `http://localhost:8000`). Set `REACT_APP_API_URL` if the backend runs on a different host/port.
- If you want a single command to run both servers locally, consider using a process manager (e.g., PowerShell jobs, `concurrently` npm package, or a simple `Makefile` on Unix). This repo does not include a single-run script by default.

Environment variables & configuration
Below are recommended environment variables used by the project. Confirm exact names in `backend/settings.py` and frontend `config` files; these are typical variables to set.

Backend (suggested `.env` keys)

- `SECRET_KEY` — Django secret (keep private).
- `DEBUG` — `True` or `False`.
- `ALLOWED_HOSTS` — comma-separated hosts for production.
- `DATABASE_URL` — optional for a non-SQLite DB (e.g., `postgres://user:pass@host:5432/dbname`).
- `CORS_ALLOWED_ORIGINS` or `CORS_ALLOWED_ORIGIN` — frontend origin(s), e.g., `http://localhost:3000`.
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` — optional.
- Third-party / integrations:
  - `ZEGOCLOUD_APPID`, `ZEGOCLOUD_SERVER_SECRET` — if using ZegoCloud for video.
  - Payment provider keys (e.g., `MPESA_KEY`, `MPESA_SECRET`) — if `payments/` expects them.

Frontend (suggested `frontend/.env.development` keys — prefix with `REACT_APP_`)

- `REACT_APP_API_URL` — e.g., `http://localhost:8000/api`
- `REACT_APP_ZEGOCLOUD_APPID` — optional ZegoCloud app id.
- `REACT_APP_FEATURE_FLAG_X` — any feature toggles your app uses.

Example: create a minimal backend `.env` in `backend/`:

```text
SECRET_KEY=replace-this-with-a-secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

And a minimal frontend `frontend/.env.development`:

```powershell
REACT_APP_API_URL=http://localhost:8000
```

Running both servers (development)

- Open two PowerShell windows (or tabs).
- Start backend:

```powershell
cd .\\backend; .\\.venv\\Scripts\\Activate; python manage.py runserver
```

- Start frontend:

```powershell
cd .\\frontend; npm start
```

Tests

- Backend tests:

```powershell
cd .\\backend
.\\.venv\\Scripts\\Activate
python manage.py test
```

- Frontend tests:

```powershell
cd .\\frontend
npm test
```

CI / Deploy notes

- This repository contains GitHub Actions workflows (`.github/workflows/`) that run tests and/or build steps for frontend and backend. Check those files for the project's CI requirements.
- For production, replace SQLite with a managed DB and configure secure secrets (do not commit them to the repo).
- Consider using Docker for consistent production builds; a `Dockerfile` / `docker-compose` are not included by default.

Troubleshooting

- CORS errors: ensure backend CORS settings allow `http://localhost:3000` or the frontend origin.
- Port conflicts: default frontend `3000` and backend `8000`. Change via `npm start` prompts or Django `runserver` arguments.
- Missing env vars: check `settings.py` and frontend config for required variables; the server may crash or return 500s if required vars are missing.
- Static files in production: configure Django `STATIC_ROOT`, run `collectstatic`, and serve via a static server or CDN. Consider `whitenoise` for simple deployments.

Contributing

- Follow the repo's PR and branch rules. Run tests locally before opening a pull request.
- Keep secrets out of commits. Use environment variables or secret stores in CI/deploy.

Contact / Support
If you need help running the app locally, open an issue with:

- OS and shell (example: Windows PowerShell v5.1)
- Python and Node versions
- Exact error messages or logs

License
Internal / TBD
