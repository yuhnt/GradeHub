# Changelog

All notable changes to Task Grading Hub. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Releases are tagged `vX.Y.Z`,
which also publishes and deploys the Docker images.

## [Unreleased] — planned as 1.1.0

### Added

- **Web client** (`frontend/`) for students and teachers: sign in, student
  registration, password reset, task list with Open/Closed/All filters and
  pagination, task create/edit/delete, PDF hand-in with client-side checks,
  inline PDF preview, grading with re-grade and "save and grade next",
  CSV export of grades, teacher test uploads, *My submissions* with average
  grade. Specified in [docs/frontend-requirements.md](docs/frontend-requirements.md).
- `GET /api/auth/me`: the signed-in user's profile.
- `GET /api/submissions/mine[?taskId=]`: a student's own submissions with a
  task summary.
- `GET /api/tasks` accepts `status=all|open|closed` and `mine=true`.
- Teacher submission lists include `student: { id, username, email }`.
- Submission objects include `gradedAt`.
- `CORS_ORIGIN` setting to restrict which sites may call the API.
- Docker images for the API (runs migrations on start, health check,
  non-root) and the web client (nginx with API proxy, caching and security
  headers), and a root `docker-compose.yml` for the whole application.
- GitHub Actions: CI on pull requests (lint, typecheck, tests, build,
  dependency audit, Docker build); CD publishing images to GitHub Container
  Registry and deploying to staging (on `main`) and production (on tags).
  Dependabot for npm, Docker and Actions.
- Documentation: API reference, architecture, deployment and operations,
  user guide.

### Changed

- Repository split into `backend/` and `frontend/`. The API's commands now
  run from `backend/`; its compose file pins the project name so existing
  database volumes are kept.
- `npm run build` also compiles `scripts/`; the server entry point moved to
  `dist/src/server.js` and the seed script is available as
  `node dist/scripts/seed-teacher.js` inside the image.
- The Prisma CLI is a production dependency so containers can apply
  migrations.
- The API closes connections cleanly on `SIGTERM`/`SIGINT`.

### Security

- bcrypt 5 → 6, which drops a vulnerable `tar` from the install chain
  (critical advisory). Existing password hashes keep working.
- `qs` / `express` patch updates for two moderate advisories.
  `npm audit` now reports no vulnerabilities in either package.

## [1.0.0] — 2026-09-18

### Added

- REST API: registration (students only), login, client-side logout,
  password reset by email; tasks with deadlines (teacher CRUD, cascading
  delete, pagination); one PDF submission per student per task, deletable
  before the deadline; teacher test submissions; grading with feedback and
  re-grading.
- PostgreSQL schema with Prisma migrations, including a partial unique
  index for the one-submission rule.
- Seed script for teacher accounts.
- 66 integration tests against a real database.
