# Task Grading Hub

[![CI](https://github.com/yuhnt/GradeHub/actions/workflows/ci.yml/badge.svg)](https://github.com/yuhnt/GradeHub/actions/workflows/ci.yml)
[![CD](https://github.com/yuhnt/GradeHub/actions/workflows/cd.yml/badge.svg?branch=main)](https://github.com/yuhnt/GradeHub/actions/workflows/cd.yml)

Teachers post tasks with deadlines, students hand in a PDF before the
deadline, and teachers grade each submission with feedback.

- **Students** register, see what is due and where they stand, upload one PDF
  per task (and replace it until the deadline), and read their grades and
  feedback.
- **Teachers** create, edit and delete tasks, try them with test uploads,
  read each PDF next to a grading form, re-grade at any time and export
  grades as CSV.

## Stack

| Part | Technology |
|---|---|
| Web client | React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form + zod, Tailwind CSS |
| API | Node.js 22, Express, TypeScript, Prisma, PostgreSQL 16, JWT + bcrypt, multer, Nodemailer |
| Tests | Vitest + Testing Library + MSW (web), Jest + supertest against a real database (API) |
| Delivery | Docker (nginx + Node images), Docker Compose, GitHub Actions, GitHub Container Registry |

## Repository layout

```
backend/      REST API, database schema and migrations, seed script  → backend/README.md
frontend/     Web client and its nginx configuration                  → frontend/README.md
docs/         Requirements, API reference, architecture, deployment, user guide
.github/      CI/CD workflows, Dependabot, pull request template
docker-compose.yml   The whole application (db + api + web) for servers and demos
```

## Try it with Docker

Needs Docker with Compose.

```bash
cp .env.example .env
# Fill in DB_PASSWORD (openssl rand -hex 24) and JWT_SECRET (openssl rand -base64 48)
docker compose up -d --build --wait
docker compose exec backend node dist/scripts/seed-teacher.js \
  --username=teacher1 --email=teacher1@example.com --password=ChangeMe123
```

Open http://localhost:8080, sign in as `teacher1`, and register a student
account in another browser (or a private window) to try both sides.

## Develop

Needs Node.js 22 (see [`.nvmrc`](.nvmrc)) and Docker for the database.

```bash
# 1. Database (PostgreSQL on localhost:5433, pgAdmin on localhost:5050)
cd backend
cp .env.example .env            # set DB_PASSWORD, DATABASE_URL, JWT_SECRET
docker compose up -d
npm install
npx prisma migrate deploy
npm run seed:teacher -- --username=teacher1 --email=teacher1@example.com --password=ChangeMe123

# 2. API on http://localhost:3000
npm run dev

# 3. Web client on http://localhost:5173 (another terminal)
cd frontend
npm install
npm run dev
```

The Vite dev server forwards `/api` to the API, so no CORS setup is needed.
Set `RESET_PASSWORD_URL=http://localhost:5173/reset-password` in
`backend/.env` to get clickable reset links.

## Test

```bash
cd backend && npm test           # 79 integration tests, needs the test database (backend/README.md#tests)
cd frontend && npm test          # 60 component and unit tests, no setup needed
cd frontend && npm run lint && npm run typecheck
```

CI runs all of this, plus dependency audits and Docker builds, on every pull
request. Merges to `main` deploy to staging; tags `vX.Y.Z` deploy to
production. See [docs/deployment.md](docs/deployment.md).

## Documentation

| Document | For |
|---|---|
| [Frontend requirements](docs/frontend-requirements.md) | What the web client does and why; acceptance criteria; open questions |
| [API reference](docs/api.md) | Every endpoint, body, response and error |
| [Architecture](docs/architecture.md) | Components, data model, session handling, technical decisions |
| [Deployment and operations](docs/deployment.md) | Pipeline, server setup, releases, rollback, backups |
| [User guide](docs/user-guide.md) | Students and teachers using the site |
| [Backend README](backend/README.md) | API setup, configuration, product decisions |
| [Frontend README](frontend/README.md) | Web client setup and conventions |
| [Changelog](CHANGELOG.md) | What changed in each release |
