# API reference

REST API of Task Grading Hub, served under `/api`. This page describes the
implementation in `backend/src`; if the two disagree, the code wins and this
page is the bug.

## Conventions

| | |
|---|---|
| Base URL | `/api` (same origin as the web client behind nginx; `http://localhost:3000/api` in development) |
| Format | JSON bodies (`Content-Type: application/json`), except PDF uploads (`multipart/form-data`) and file downloads (`application/pdf`) |
| Auth | `Authorization: Bearer <JWT>` on every route except the public auth routes. The token carries `{ userId, role }` and expires after `JWT_EXPIRES_IN` (default 1 day). |
| Ids | Positive integers. A non-numeric `:id` gives `400 { "error": "invalid id" }`. |
| Timestamps | ISO 8601 in UTC, e.g. `"2026-09-25T10:00:00.000Z"`. Stored with second precision. |
| Errors | Always `{ "error": "<message>" }`. Validation errors report the first problem only. |

### Status codes

| Code | Meaning |
|---|---|
| 400 | Bad input (format, missing field, wrong type) or a missed deadline |
| 401 | No token (`authentication required`) or a bad/expired token (`invalid or expired token`); also a failed login |
| 403 | Wrong role, or changing a task that belongs to another teacher |
| 404 | Doesn't exist, **or** exists but belongs to someone else (existence is hidden) |
| 409 | Duplicate: username, email, or a second submission for the same task |
| 500 | `internal server error` (details only in the server log) |

A malformed JSON body gives `400 { "error": "malformed JSON body" }`.

### Health check

`GET /health` (outside `/api`, no auth) → `200 { "status": "ok", "timestamp": "…" }`. Used by the container health check.

---

## Auth

### `POST /api/auth/register`
Public. Always creates a **student**; a `role` field in the body is ignored (decision 4).

```json
{ "username": "linh", "email": "linh@example.com", "password": "SecurePass123" }
```

| Status | Body |
|---|---|
| 201 | `{ "id": "7", "username": "linh", "email": "linh@example.com", "role": "student" }` (note: `id` is a string here, a number everywhere else; kept for compatibility) |
| 400 | username 3–50 chars, valid email, password 8–100 chars (zod messages, e.g. `Invalid email`) |
| 409 | `username already taken` / `email already registered` |

No token is returned: call `/login` next.

### `POST /api/auth/login`
Public.

```json
{ "username": "linh", "password": "SecurePass123" }
```

| Status | Body |
|---|---|
| 200 | `{ "token": "<JWT>" }` |
| 401 | `invalid username or password` (same for unknown user and wrong password) |

### `POST /api/auth/logout`
Always `200 { "msg": "logged out" }`. Logout is client-side: the client discards the token; there is no server-side revocation (decision 3).

### `GET /api/auth/me`  *(added in 1.1)*
Any signed-in user.

| Status | Body |
|---|---|
| 200 | `{ "id": 7, "username": "linh", "email": "linh@example.com", "role": "student" }` |
| 401 | no/bad token, or the account no longer exists (`invalid or expired token`) |

### `POST /api/auth/forgot-password`
Public. Answers identically whether or not the email belongs to an account. If it does, a single-use token valid for `RESET_TOKEN_EXPIRY_MINUTES` (default 30) is emailed; only its SHA-256 hash is stored.

```json
{ "email": "linh@example.com" }
```

| Status | Body |
|---|---|
| 200 | `{ "message": "If that email exists, a reset link has been sent" }` |
| 400 | `Invalid email` |

The email contains `RESET_PASSWORD_URL?token=<token>` when that setting is present, otherwise the bare token.

### `POST /api/auth/reset-password`
Public.

```json
{ "token": "<token from the email>", "newPassword": "BrandNewPass456" }
```

| Status | Body |
|---|---|
| 200 | `{ "message": "password reset successful" }` |
| 400 | `invalid or expired token` (unknown, expired or already used), or a password shorter than 8 / longer than 100 |

---

## Tasks

Task object:

```json
{
  "id": 12,
  "title": "Lab report 3: Normalisation",
  "description": "Normalise the library schema to 3NF.",
  "deadline": "2026-09-25T10:00:00.000Z",
  "createdBy": 2,
  "createdAt": "2026-09-18T09:27:41.000Z"
}
```

### `POST /api/tasks`
Teacher.

```json
{ "title": "…", "description": "…", "deadline": "2026-09-25T17:00:00+07:00" }
```

| Status | Body |
|---|---|
| 201 | task |
| 400 | `title, description missing` · `title, description too long` (title > 150, description > 1000) · `deadline missing` · `invalid deadline format` (must be ISO 8601 with offset or `Z`) · `invalid deadline: deadline must later than now` |
| 403 | `not allowed to create task` (student) |

### `GET /api/tasks`
Any signed-in user.

| Query | Default | |
|---|---|---|
| `page` | 1 | positive integer |
| `limit` | 20 | 1–100 |
| `status` | `all` | `open`: deadline ahead, soonest first · `closed`: deadline passed, most recent first · `all`: every task by deadline, soonest first *(added in 1.1)* |
| `mine` | `false` | `true`: only tasks the requester created *(added in 1.1)* |

| Status | Body |
|---|---|
| 200 | `{ "tasks": [task…], "page": 1, "limit": 20, "total": 42, "totalPages": 3 }` |
| 400 | `page must be a positive integer` · `limit must be an integer between 1 and 100` · `status must be one of all, open, closed` · `mine must be true or false` |

### `GET /api/tasks/:id`
Any signed-in user. `200` task · `404 task not found`.

### `PUT /api/tasks/:id`
Owning teacher. Full replace: same body and validation as `POST`, so the deadline must again be in the future. Moving it later reopens submissions; moving it earlier can lock students out (decision 5).

| Status | Body |
|---|---|
| 200 | task |
| 400 | as for `POST` |
| 403 | `not allowed to update task` (student, or another teacher: task existence isn't secret) |
| 404 | `task not found` |

### `DELETE /api/tasks/:id`
Owning teacher. Deletes the task **and all its submissions, grades and stored PDFs** (decision 1).

`200 { "msg": "task deleted successful" }` · `403 forbidden` · `404 task not found`

### `GET /api/tasks/:id/submissions`
Owning teacher. Real submissions only (test uploads are left out), oldest first.

```json
{
  "task": { "id": 12, "title": "…", "description": "…", "deadline": "…" },
  "submissions": [
    {
      "id": 31, "taskId": 12, "userId": 7, "filePath": "uploads/1789…pdf",
      "submittedAt": "…", "grade": null, "feedback": null, "gradedAt": null, "isTest": false,
      "student": { "id": 7, "username": "linh", "email": "linh@example.com" }
    }
  ]
}
```

`student` was added in 1.1. Errors: `403 only teacher can view` (student) · `404 task not found, or you did not create this task`.

### `POST /api/tasks/:id/test-submission`
Owning teacher. `multipart/form-data` with the PDF in `file`. No deadline check and no limit on the number of uploads (decision 6). The result is marked `isTest: true` and never shown to students or in the grading list.

| Status | Body |
|---|---|
| 201 | submission |
| 400 | file errors (see below) |
| 403 | `only teachers can submit test files` (student) · `you did not create this task` |
| 404 | `task not found` |

---

## Submissions

Submission object:

```json
{
  "id": 31, "taskId": 12, "userId": 7, "filePath": "uploads/1789724363501-994726310.pdf",
  "submittedAt": "2026-09-18T09:28:10.000Z",
  "grade": 88, "feedback": "Clear steps.", "gradedAt": "2026-09-18T09:29:02.000Z",
  "isTest": false
}
```

`gradedAt` was added to this object in 1.1.

**File errors** (both upload routes): `400 no file attached` · `400 file must be a PDF` (checked by the declared MIME type) · `400 file must be at most 10MB` · `400 the PDF must be sent in the "file" field`.

### `POST /api/submissions`
Student. `multipart/form-data` with `taskId` and `file`.

```
curl -H "Authorization: Bearer $TOKEN" -F taskId=12 -F "file=@answer.pdf;type=application/pdf" /api/submissions
```

| Status | Body |
|---|---|
| 201 | submission |
| 400 | `taskId missing` · `taskId must be a number` · `deadline has passed` · file errors |
| 403 | `only students can submit` |
| 404 | `task not found` |
| 409 | `submission already exists for this task` (one per student per task; delete it first to resubmit) |

### `GET /api/submissions/mine`  *(added in 1.1)*
Student. Their own submissions, newest first, each with a task summary. `?taskId=12` narrows to one task (an empty list if there is none).

```json
{ "submissions": [ { "…submission fields": "…", "task": { "id": 12, "title": "…", "deadline": "…" } } ] }
```

`400 taskId must be a number` · `403 only students have their own submissions`

### `GET /api/submissions/:id`
The student who owns it, or the teacher who owns its task (test uploads included). Anyone else: `404 submission not found`.

### `GET /api/submissions/:id/file`
Same visibility. `200` with `Content-Type: application/pdf` · `404 submission not found` · `404 file not found` (row exists, file missing on disk).

### `DELETE /api/submissions/:id`
Owning student, before the deadline.

`200 { "msg": "Submissions deleted" }` · `400 deadline has passed` · `403 only students allowed to delete` · `404 submission not found`

---

## Grades

Grades live on the submission row. A teacher can grade again at any time; each call replaces grade, feedback and `gradedAt` (decision 2).

### `PATCH /api/submissions/:id/grade`
Teacher who owns the task.

```json
{ "grade": 88, "feedback": "Clear steps. Show the dependencies next time." }
```

`feedback` is optional (string up to 5000 characters, or `null`).

| Status | Body |
|---|---|
| 200 | `{ "id": 31, "submissionId": 31, "grade": 88, "feedback": "…", "gradedAt": "…" }` |
| 400 | `grade is required and must be an integer` · `grade must be between 0 and 100` · `feedback must be a string` |
| 403 | `only teachers can grade submissions` |
| 404 | `submission not found` (including another teacher's) |

### `GET /api/submissions/:id/grade`
Same visibility as `GET /api/submissions/:id`. Not graded yet is a normal answer, not an error.

```json
{ "submissionId": 31, "graded": false, "grade": null, "feedback": null, "gradedAt": null }
```

---

## Changes by version

| Version | Changes |
|---|---|
| 1.1.0 | Added `GET /api/auth/me`, `GET /api/submissions/mine`, `status` and `mine` on `GET /api/tasks`, `student` on teacher submission rows, `gradedAt` on submission objects. All backward compatible. |
| 1.0.0 | First release. |
