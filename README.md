# CalorieChecker

> AI-powered meal analysis and calorie tracking — describe your meal or upload a photo and Claude AI breaks down the nutrition instantly.

![CI](https://github.com/vnikiforovski/CalorieChecker/actions/workflows/ci.yml/badge.svg?branch=develop)
![CD](https://github.com/vnikiforovski/CalorieChecker/actions/workflows/cd.yml/badge.svg?branch=master)
![Docker Backend](https://img.shields.io/docker/v/vnikiforovski0604/caloriechecker-backend?label=backend)
![Docker Frontend](https://img.shields.io/docker/v/vnikiforovski0604/caloriechecker-frontend?label=frontend)

## About

CalorieChecker lets users log meals by text description or photo. It uses [Anthropic Claude](https://www.anthropic.com/) to identify food items, estimate portion sizes, and calculate macronutrients (calories, protein, carbs, fat). Users get a daily dashboard, 7-day trend charts, logging streaks, and water intake tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5 · Django REST Framework · SimpleJWT |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Database | PostgreSQL 15 |
| Frontend | React 18 · Vite · Tailwind CSS · Recharts |
| Server | Gunicorn · Nginx (reverse proxy) |
| Container | Docker · Docker Compose |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- An [Anthropic API key](https://console.anthropic.com/)

### Run Locally (without Docker)

1. **Clone the repository**

   ```bash
   git clone https://github.com/vnikiforovski/CalorieChecker.git
   cd CalorieChecker
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Open .env and fill in your values (see Environment Variables section)
   ```

3. **Start the backend**

   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   # API available at http://localhost:8000
   ```

4. **Start the frontend** (in a new terminal)

   ```bash
   cd frontend
   npm install
   npm run dev
   # App available at http://localhost:5173
   ```

### Run with Docker

```bash
# Copy and fill in the environment file
cp .env.example .env

# Build and start all services (db, backend, frontend/nginx)
docker-compose up --build

# Run in the background
docker-compose up -d --build
```

The app will be available at `http://localhost`.

```bash
# Stop services
docker-compose down

# Stop and delete all data (removes the PostgreSQL volume)
docker-compose down -v
```

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

## Environment Variables

Copy `.env.example` to `.env` and set the following values:

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI | `sk-ant-...` |
| `DJANGO_SECRET_KEY` | Django secret key (long random string) | `your-secret-key-here` |
| `DEBUG` | Enable Django debug mode (`True` / `False`) | `False` |
| `POSTGRES_DB` | PostgreSQL database name | `calorie_checker_db` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `strongpassword` |
| `POSTGRES_HOST` | PostgreSQL host | `db` (Docker) or `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |

See `.env.example` for a ready-to-fill template.

## CI/CD

The project uses a **GitFlow**-based GitHub Actions setup with three pipelines:

| Branch | Workflow | Jobs |
|--------|----------|------|
| `feature/*` | `feature.yml` | Lint (Python only) — fast feedback < 1 min |
| `develop` | `ci.yml` | Lint → Test → Build → Security scan |
| `master` | `cd.yml` | Test → Build & push → Security scan → Release (on tag) |

### DockerHub Images

| Image | Tags |
|-------|------|
| [`vnikiforovski0604/caloriechecker-backend`](https://hub.docker.com/r/vnikiforovski0604/caloriechecker-backend) | `latest`, `<sha7>`, `<v1.2.3>` |
| [`vnikiforovski0604/caloriechecker-frontend`](https://hub.docker.com/r/vnikiforovski0604/caloriechecker-frontend) | `latest`, `<sha7>`, `<v1.2.3>` |

### Creating a Release

Push a semantic version tag to trigger the full release pipeline:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will automatically:
1. Run the Django test suite
2. Build and push Docker images tagged `:v1.0.0`, `:latest`, and `:<sha7>`
3. Run a Trivy security scan and upload results to GitHub Security
4. Create a GitHub Release with a changelog, image links, and the scan report attached

### Required GitHub Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your DockerHub username |
| `DOCKERHUB_TOKEN` | DockerHub access token (not your password) |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health/` | No | Health check (used by Docker) |
| `POST` | `/api/auth/register/` | No | Create account, returns JWT tokens |
| `POST` | `/api/auth/login/` | No | Login, returns JWT tokens |
| `POST` | `/api/auth/logout/` | Yes | Blacklist the refresh token |
| `POST` | `/api/auth/token/refresh/` | No | Refresh an access token |
| `GET/PUT` | `/api/auth/profile/` | Yes | Get or update user profile |
| `POST` | `/api/meals/analyze/` | Yes | Analyse a meal (text or image) |
| `GET` | `/api/meals/history/` | Yes | List past meals (filterable by date/type) |
| `DELETE` | `/api/meals/<id>/` | Yes | Delete a meal |
| `PUT` | `/api/meals/<id>/correct/` | Yes | Correct food item quantities |
| `POST` | `/api/meals/<id>/favorite/` | Yes | Mark a meal as a favourite |
| `GET` | `/api/meals/favorites/` | Yes | List favourite meals |
| `POST` | `/api/meals/<id>/relog/` | Yes | Re-log a favourite meal |
| `GET` | `/api/dashboard/today/` | Yes | Today's totals, goals, and streak |
| `GET` | `/api/dashboard/weekly/` | Yes | 7-day nutrition summary |
| `PUT` | `/api/dashboard/water/` | Yes | Update water intake |

## Project Structure

```
CalorieChecker/
├── .github/workflows/     # CI/CD pipelines (ci, cd, feature)
├── backend/               # Django application
│   ├── calorie_checker/   # Project settings and URL routing
│   ├── meals/             # Meal logging, analysis, dashboard
│   ├── users/             # Authentication and user profiles
│   ├── ai_service/        # Anthropic Claude integration
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/              # React + Vite application
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml     # Production services
├── docker-compose.dev.yml # Development overrides (hot reload)
└── .env.example           # Environment variable template
```
