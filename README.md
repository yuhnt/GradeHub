# Task Grading Hub

Teachers post tasks with deadlines; students submit PDFs before the deadline;
teachers grade submissions. Built with Express, TypeScript, PostgreSQL (via
Prisma), JWT auth, and multer for file uploads.

## Stack
- TypeScript
- Express
- PostgreSQL + Prisma
- JWT (jsonwebtoken) + bcrypt
- multer (PDF uploads)
- zod (validation)
- Jest + supertest (testing)

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in real values (at least
   `DATABASE_URL` and `JWT_SECRET`):
   ```
   cp .env.example .env
   ```

3. Start Postgres (and pgAdmin on http://localhost:5050):
   ```
   docker compose up -d
   ```

4. Apply the migrations. The second migration is hand-written: it adds the
   partial unique index on `submissions` that Prisma can't express. Read
   `prisma/PARTIAL_INDEX_NOTE.md` before creating new migrations with
   `migrate dev`.
   ```
   npx prisma migrate deploy
   ```

5. (Optional) Password reset emails are sent over SMTP with Nodemailer.
   With no `SMTP_HOST`, reset tokens are just printed to the server console.
   - Fake inbox for development, no signup: `SMTP_HOST="ethereal"`. The
     console prints a link to view each email.
   - Real emails via Gmail: turn on 2-Step Verification, create an App
     Password at https://myaccount.google.com/apppasswords, then set
     `SMTP_HOST="smtp.gmail.com"`, `SMTP_PORT=587`, `SMTP_USER` (your
     Gmail address), `SMTP_PASS` (the App Password) and `MAIL_FROM`.
   - Set `RESET_PASSWORD_URL` if you have a frontend reset page; the email
     then contains a link instead of the raw token.

6. Create a teacher account. Public registration only creates students
   (decision 4 below):
   ```
   npm run seed:teacher -- --username=drhossam --email=hossam@example.com --password=SecurePass123
   ```

7. Start the dev server:
   ```
   npm run dev
   ```
   Or build and run the compiled version:
   ```
   npm run build && npm start
   ```

## Tests

The tests are integration tests against a real Postgres database. They load
`.env.test` when it exists, so they never touch the dev database. Set it up
once:

```
docker exec taskgrade_postgres psql -U <DB_USER> -d postgres -c "CREATE DATABASE taskgrade_test"
```

Next, create `.env.test`: copy `.env`, point `DATABASE_URL` at
`taskgrade_test`, and set `UPLOAD_DIR="uploads-test"`. Then apply the
migrations to the test database:

```
set -a; . ./.env.test; set +a; npx prisma migrate deploy   # bash; loads .env.test into the shell first
```

Run the suite. Tests run serially (`--runInBand`) because they share one
database, and the test upload directory is deleted when they finish:

```
npm test
```

## API

All routes except `/api/auth/*` need `Authorization: Bearer <token>`.
Errors always look like `{ "error": "<message>" }`.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | public | always creates a student |
| POST | `/api/auth/login` | public | returns `{ token }` |
| POST | `/api/auth/logout` | any | client-side only (decision 3) |
| POST | `/api/auth/forgot-password` | public | emails a reset token over SMTP; same response whether or not the email exists |
| POST | `/api/auth/reset-password` | public | single-use token |
| POST | `/api/tasks` | teacher | `{ title, description, deadline }`, deadline must be in the future |
| GET | `/api/tasks?page=1&limit=20` | any | `{ tasks, page, limit, total, totalPages }`; limit is 1-100, default 20 |
| GET | `/api/tasks/:id` | any | |
| PUT | `/api/tasks/:id` | owning teacher | full replace; other teachers get 403 |
| DELETE | `/api/tasks/:id` | owning teacher | cascades to submissions, grades and their PDFs |
| GET | `/api/tasks/:id/submissions` | owning teacher | leaves out test submissions; other teachers get 404 |
| POST | `/api/tasks/:id/test-submission` | owning teacher | multipart `file`; no deadline or count limit |
| POST | `/api/submissions` | student | multipart `taskId` + `file` (PDF, 10MB max) |
| GET | `/api/submissions/:id` | owner student / owning teacher | everyone else gets 404 |
| GET | `/api/submissions/:id/file` | owner student / owning teacher | downloads the PDF |
| DELETE | `/api/submissions/:id` | owner student | only before the deadline |
| PATCH | `/api/submissions/:id/grade` | owning teacher | `{ grade: 0-100 integer, feedback? }`, can be repeated to re-grade |
| GET | `/api/submissions/:id/grade` | owner student / owning teacher | `graded: false` until graded |

Status codes follow the user stories:
- 400: bad input, or a missed deadline
- 401: no token or a bad token
- 403: wrong role, or editing/deleting another teacher's task
- 404: missing, or hidden because it belongs to someone else
- 409: duplicate submission

## Decisions locked in

1. **Task deletion cascades.** Deleting a task deletes its submissions,
   their grades, and the uploaded PDFs. This is intentional, not a bug.
2. **Re-grading is allowed.** `PATCH .../grade` overwrites `grade`,
   `feedback` and `gradedAt` every time.
3. **Logout is client-side.** The client discards the token. JWTs are
   stateless and there's no blacklist.
4. **Teachers are created by `scripts/seed-teacher.ts` only.** `/register`
   ignores any `role` field.
5. **Deadlines are freely editable.** A new deadline applies to future
   submit/delete requests. Late submissions are rejected, never stored.
6. **Test submissions are unrestricted.** The one-submission-per-task rule
   applies only to `isTest = false` rows (a partial unique index).

## Project layout

```
src/
  routes/         Express route definitions, grouped by resource
  controllers/    Thin HTTP layer: parses req, calls a service, sends res
  services/       Business logic (deadline checks, ownership rules, etc.)
  repositories/   Prisma queries only - no business logic
  validators/     zod schemas for request bodies
  middleware/     auth, error handling, multer, validation
  config/         env loading, Prisma client singleton
  utils/          JWT, passwords/reset tokens, id parsing, response DTOs, file cleanup
  server.ts       Entry point (index.ts re-exports it for `npm run dev`)
scripts/
  seed-teacher.ts Creates a teacher account out-of-band
prisma/
  schema.prisma, migrations/, PARTIAL_INDEX_NOTE.md
tests/            Jest + supertest integration tests (auth, task, submission, grade)
```

## Known limitations

- Uploads are checked by the client-declared MIME type only, not by
  inspecting the file's bytes.
- Password reset emails need SMTP settings (see Setup step 5). Without them, tokens are logged to the console.
