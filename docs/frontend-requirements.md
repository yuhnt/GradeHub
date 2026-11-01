# Task Grading Hub: Frontend Requirements Specification

| | |
|---|---|
| Document | Frontend requirements (web client) |
| Version | 1.0 |
| Date | 2026-09-18 |
| Status | Implemented in release 1.1.0 (see [CHANGELOG](../CHANGELOG.md)) |
| Related | [API reference](api.md), [Architecture](architecture.md), [Deployment](deployment.md), [User guide](user-guide.md), backend decisions in [backend/README.md](../backend/README.md#decisions-locked-in) |

Priorities use MoSCoW: **M**ust, **S**hould, **C**ould. Every requirement
below marked *Done* is covered by an automated test or was checked by hand
against the real backend (see [section 11](#11-verification)).

---

## 1. Purpose and scope

Task Grading Hub already has a REST API: teachers post tasks with deadlines,
students hand in one PDF per task before the deadline, and teachers grade the
submissions. This document specifies the **web client** that makes the API
usable by people: what each role can see and do, how each screen behaves,
and the quality bar the client has to meet.

In scope: every flow the API supports for students and teachers, in a
browser, on desktop and phone.

Out of scope: creating teacher accounts (done by an administrator with a
script, decision 4), and the items in [section 9](#9-out-of-scope-and-future-work).

## 2. Users and roles

| Role | Who | Gets an account by | Main goals |
|---|---|---|---|
| Student | Enrolled learner | Registering on the site | See what is due, hand in a PDF on time, read grades and feedback |
| Teacher | Course staff | Administrator runs the seed script | Post and manage tasks, check submissions, grade them, export grades |
| Administrator | IT / project owner | n/a (server access) | Create teacher accounts, deploy, back up |

A user has exactly one role. The client never trusts its own idea of the
role for security: the API enforces every rule, and the client mirrors the
rules only to hide actions that would fail.

## 3. Constraints and assumptions

- The backend API ([api.md](api.md)) is the source of truth. Validation rules
  in the client copy the backend's limits so users see problems before a
  round trip.
- The six locked decisions apply unchanged: cascading task deletion,
  re-grading allowed, client-side logout, teachers created by script,
  freely editable deadlines, unrestricted teacher test submissions.
- Deadlines are stored in UTC and shown in the viewer's time zone.
- The client is a single-page app served as static files. In production
  nginx serves it and proxies `/api` to the backend on the same origin, so
  no CORS setup is needed.
- UI language: English. Dates and numbers follow the browser's locale.

## 4. Site map and access

| Path | Page | Student | Teacher | Signed out |
|---|---|---|---|---|
| `/login` | Sign in | redirect to `/tasks` | redirect to `/tasks` | yes |
| `/register` | Create student account | redirect | redirect | yes |
| `/forgot-password` | Request reset link | redirect | redirect | yes |
| `/reset-password?token=` | Choose new password | yes | yes | yes |
| `/tasks` | Task list | all tasks | own tasks (toggle: all) | → `/login` |
| `/tasks/new` | Create task | "no access" page | yes | → `/login` |
| `/tasks/:id` | Task detail | + own submission panel | + submissions and test panel if owner | → `/login` |
| `/tasks/:id/edit` | Edit task | "no access" page | owner only | → `/login` |
| `/submissions/:id` | Submission (PDF + grade) | own only | own tasks only | → `/login` |
| `/my-submissions` | Everything I handed in | yes | "no access" page | → `/login` |
| anything else | Not found | yes | yes | → `/login` |

"→ `/login`" keeps the requested address; after signing in the user lands
where they were going.

## 5. Functional requirements

### 5.1 Authentication and session

| ID | Pri | Requirement | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-AUTH-01 | M | Sign in with username and password. | Empty fields are flagged before any request. A wrong username or password shows one generic message ("Incorrect username or password.") so accounts can't be probed. On success the user lands on the page they first asked for, or `/tasks`. | Done |
| FR-AUTH-02 | M | Students register themselves. | Username 3–50 characters, valid email, password 8–100 characters, confirmation must match. A taken username or email is shown on that field. After registering the student is signed in automatically. The form offers no role choice. | Done |
| FR-AUTH-03 | M | Request a password reset. | Any well-formed email gets the same "check your email" screen, whether or not an account uses it. | Done |
| FR-AUTH-04 | M | Reset the password from the email. | Opening the emailed link (`/reset-password?token=…`) asks only for the new password twice. When the email carries a bare code instead (no `RESET_PASSWORD_URL` on the server), the page offers a field to paste it. An invalid, expired or used code explains itself and links to request a new one. Success sends the user to sign in, signing out any session on that device. | Done |
| FR-AUTH-05 | M | Sign out. | Removes the token from the device and clears all cached data, so the next person on a shared computer sees nothing of the previous user (decision 3: no server call is needed). | Done |
| FR-AUTH-06 | M | End the session when it expires. | The client signs out when the token's expiry passes (even with the tab idle) or when any API call answers 401, and says "Your session has expired". | Done |
| FR-AUTH-07 | S | Keep tabs in sync. | Signing out in one tab signs out every tab; signing in as someone else reloads the profile everywhere. | Done |
| FR-AUTH-08 | S | Survive a server outage at startup. | If the profile can't be loaded because the server is unreachable, show "Can't reach Task Grading Hub" with *Try again* and *Sign out*, instead of a blank page or a false sign-out. | Done |

### 5.2 Tasks

| ID | Pri | Requirement | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-TASK-01 | M | List tasks with a status filter. | Tabs *Open* (default; soonest deadline first), *Closed* (most recent first) and *All*. 10 per page with Previous/Next and "Page x of y". Filter and page live in the URL, so they survive reloads and can be shared. | Done |
| FR-TASK-02 | M | Show each task's deadline clearly. | Badge *Open*, *Due soon* (under 24 hours) or *Closed*; absolute local date and time plus relative time ("in 3 days"). Badges and buttons update on their own when a deadline passes while the page is open. | Done |
| FR-TASK-03 | M | Students see where they stand on every task. | Each row shows *To do*, *Submitted*, the grade (e.g. *88 / 100*), or *Not submitted* once closed. | Done |
| FR-TASK-04 | S | Teachers see their own tasks first. | Teachers start on *My tasks* and can switch to *All teachers' tasks*, where their own are marked *Yours*. | Done |
| FR-TASK-05 | M | Task detail. | Title, deadline, posting date and instructions with line breaks kept. What else appears depends on the role (FR-SUB, FR-GRADE). Another teacher's task is readable but shows a note instead of submissions. A missing task shows "Task not found". | Done |
| FR-TASK-06 | M | Create a task (teacher). | Title (max 150, live counter), instructions (max 1000, live counter), deadline picker in local time with the time zone shown. A past deadline is rejected before sending. On success the new task opens. | Done |
| FR-TASK-07 | M | Edit a task (owning teacher). | Same form, prefilled. An info note says moving the deadline earlier can lock students out. For a task whose deadline has passed, the deadline starts empty and a warning explains that saving reopens the task (the API requires a future deadline). Non-owners get a "no access" page. | Done |
| FR-TASK-08 | M | Delete a task (owning teacher). | Confirmation dialog states how many student submissions, grades and PDFs will be deleted with it (decision 1) and that this can't be undone. Afterwards the user is back on the list. | Done |

### 5.3 Student submissions

| ID | Pri | Requirement | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-SUB-01 | M | Hand in a PDF before the deadline. | Pick or drag one file. Anything that isn't a PDF, is empty, or is over 10 MB is refused on the spot with the reason, and the Submit button stays disabled. While the file is sent the button shows a spinner and "Uploading…"; success says so and the panel switches to the submitted state. | Done |
| FR-SUB-02 | M | One submission per task. | With a submission in place no upload control is shown. If the API still reports a duplicate (e.g. a second tab), the message explains how to replace the file and the panel refreshes. | Done |
| FR-SUB-03 | M | Replace a submission before the deadline. | *Delete* asks for confirmation, says until when a new file can be uploaded, and warns that an existing grade goes with it. Afterwards the upload control returns. | Done |
| FR-SUB-04 | M | Lock after the deadline. | Once closed, no delete or upload controls; a note says the submission can't change. Without a submission: "you didn't hand anything in". | Done |
| FR-SUB-05 | M | Handle a deadline that passes mid-upload. | The API's refusal is shown as a notification, and the task reloads to its closed state. | Done |
| FR-SUB-06 | M | See the grade. | Grade out of 100, the teacher's feedback (line breaks kept) and when it was graded; or "Not graded yet". | Done |
| FR-SUB-07 | M | View one's own PDF. | *View PDF* opens the submission page with the file shown inline and a *Download PDF* button. | Done |
| FR-SUB-08 | S | *My submissions* page. | Every submission, newest first, with task, deadline status, hand-in time and grade, plus a summary: count handed in, count graded, average grade. | Done |

### 5.4 Teacher review and grading

| ID | Pri | Requirement | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-GRADE-01 | M | See who handed in. | On their own task, a table of real submissions (test uploads never appear) with student username and email, hand-in time, grade and a *Grade* / *Review* button. Header: "N submitted · G graded · R to grade". | Done |
| FR-GRADE-02 | S | Focus on what is left. | Filter *All* / *Not graded*. | Done |
| FR-GRADE-03 | S | Export grades. | *Export CSV* downloads student, email, submitted at, grade, feedback, graded at. Opens correctly in Excel (UTF-8 BOM) and is protected against formula injection. | Done |
| FR-GRADE-04 | M | Read the PDF while grading. | The submission page shows the PDF inline beside the grading form, with a download fallback for browsers that can't show PDFs inline. | Done |
| FR-GRADE-05 | M | Grade a submission. | Grade must be a whole number from 0 to 100 (checked before sending); feedback optional, max 5000 characters with a counter. Saving confirms with the grade. | Done |
| FR-GRADE-06 | M | Re-grade. | A graded submission opens with its grade and feedback filled in, shows when it was last graded, and the button reads *Update grade* (decision 2). | Done |
| FR-GRADE-07 | S | Grade in sequence. | *Save and grade next* saves, then opens the next ungraded submission of the same task. Hidden when nothing is left. | Done |
| FR-GRADE-08 | S | Test the task as a student would. | On their own task, the teacher can upload test PDFs (no deadline or count limit, decision 6), then open each one. Test uploads never reach students or the grading list. | Done (uploads from earlier visits aren't listed: the API has no endpoint for it) |

### 5.5 General behaviour

| ID | Pri | Requirement | Acceptance criteria | Status |
|---|---|---|---|---|
| FR-GEN-01 | M | Every data view has loading, empty and error states. | Errors say what happened in plain words and offer *Try again* where retrying can help. | Done |
| FR-GEN-02 | M | Plain-language errors. | Backend error strings are rewritten into sentences the user can act on (table in [section 8](#8-ux-guidelines)). | Done |
| FR-GEN-03 | S | Useful browser tabs. | Page titles like "Lab report 3 · Task Grading Hub". | Done |
| FR-GEN-04 | S | Navigation feels like a website. | New pages open at the top; Back restores the scroll position; deep links work on reload. | Done |
| FR-GEN-05 | M | Unknown addresses. | A "Page not found" page with a way back. | Done |

## 6. Non-functional requirements

| ID | Area | Requirement | How it is met |
|---|---|---|---|
| NFR-01 | Performance | First load ≤ 150 KB of JavaScript (gzip) on the sign-in page. | 87 KB gzip entry chunk; every page is a separate chunk loaded on first visit. Static assets are cached for a year (hashed names); `index.html` is never cached, so deploys show up on the next load. |
| NFR-02 | Performance | Lists and pages stay responsive. | Server-side pagination (10 per page), previous page stays visible while the next loads, data cached for 30 s and refreshed when the window regains focus. |
| NFR-03 | Accessibility | Target WCAG 2.1 AA. | Every input has a visible label; errors are linked with `aria-describedby` and `aria-invalid`; keyboard focus is always visible; "Skip to content" link; dialogs use native `<dialog>` (focus trap, Esc); status messages use live regions; icons are hidden from screen readers; text colours meet AA contrast. |
| NFR-04 | Responsive | Usable from 360 px wide phones to desktop. | Single-column layout under 1024 px, tables scroll horizontally inside their card, no page-level horizontal scroll. |
| NFR-05 | Browsers | Latest two versions of Chrome, Edge, Firefox and Safari (desktop and mobile). | Built for ES2022; inline PDF preview falls back to download where unsupported. |
| NFR-06 | Security | No script injection; limited damage if it happens. | React escapes all text; no raw HTML rendering. Strict Content-Security-Policy (`script-src 'self'`), `nosniff`, `frame-ancestors 'none'`, referrer policy. Same-origin API. CSV export neutralises formulas. |
| NFR-07 | Security | Session storage trade-off is documented. | The JWT is kept in `localStorage` so sessions survive reloads. It is readable by scripts on the page, which the CSP above mitigates. Moving to an httpOnly cookie needs backend changes (see section 9). |
| NFR-08 | Privacy | Shared computers. | Signing out, or a session ending, wipes all cached data from memory. |
| NFR-09 | Maintainability | Type-safe, linted, tested. | TypeScript strict mode, ESLint (including React hooks rules), 60 automated tests. CI blocks merges on lint, typecheck, test, build and dependency audit failures. |
| NFR-10 | Operability | Runs as a container. | nginx image with health check (`/healthz`), API proxy, gzip and security headers; configured by one variable (`API_UPSTREAM`). |

## 7. Backend changes made for the frontend

The API as delivered in 1.0 couldn't support some screens. These additions
are backward compatible (new endpoints, new optional query parameters and
new response fields only).

| ID | Change | Why the UI needs it | Status |
|---|---|---|---|
| BE-01 | `GET /api/auth/me` returns `{ id, username, email, role }`. | Show who is signed in, and check a stored token on startup. The JWT holds only the id and role. | Done |
| BE-02 | `GET /api/submissions/mine[?taskId=]` lists the student's own submissions with a task summary. | After a reload, the student had no way to find their submission for a task (only lookup by submission id existed). Also powers *My submissions* and the list badges. | Done |
| BE-03 | `GET /api/tasks/:id/submissions` rows include `student: { id, username, email }`. | Teachers grade people, not user ids. | Done |
| BE-04 | `GET /api/tasks` accepts `status=all\|open\|closed` and `mine=true`. | With deadline-ascending order and no filter, page 1 would fill up with long-closed tasks; teachers need their own tasks. | Done |
| BE-05 | Submission responses include `gradedAt`. | Show when a grade was given without a second request. | Done |
| BE-06 | `CORS_ORIGIN` setting (comma-separated origins). | Lock the API to the site's origin when it isn't served same-origin. Unset keeps the old allow-all behaviour. | Done |
| BE-07 | Graceful shutdown on SIGTERM. | Containers finish in-flight uploads before stopping. | Done |
| BE-08 | bcrypt 5 → 6, `qs`/`express` patch updates. | Clears all `npm audit` findings (critical `tar` advisory via bcrypt's installer) so CI can gate on audits. Existing password hashes stay valid. | Done |

## 8. UX guidelines

- **Layout.** Signed-out pages: a centered card. Signed-in pages: top bar
  (logo, *Tasks*, *My submissions* for students, user name and email, role
  badge, *Sign out*) and content up to 1152 px wide.
- **Feedback.** Inline messages for form problems; toasts for completed
  actions and for problems that outlive the component (e.g. the deadline
  passing mid-upload).
- **Destructive actions** always go through a confirmation dialog that says
  exactly what will be lost.
- **Copy.** Short, specific, no jargon, no blame. Backend messages the user
  can hit are rewritten:

| API message | Shown to the user |
|---|---|
| `invalid username or password` | Incorrect username or password. |
| `username already taken` / `email already registered` | That username is already taken. / An account with that email already exists. |
| `invalid or expired token` (reset, 400) | This reset link is invalid, expired or already used. Request a new one. |
| any 401 while signed in | Your session has expired. Please sign in again. |
| `deadline has passed` | The deadline for this task has passed. |
| `submission already exists for this task` | You have already submitted this task. Delete that submission first to upload a different file. |
| `file must be a PDF` / `file must be at most 10MB` | Only PDF files are accepted. / The file is larger than 10 MB. |
| network failure | Can't reach the server. Check your connection and try again. |
| 500 | Something went wrong on our side. Please try again in a moment. |

## 9. Out of scope and future work

Proposed for later releases, roughly in order of value:

1. **Upload progress bar** for large PDFs on slow connections (the current
   indicator is a spinner).
2. **Email or in-app notification** when a grade is published.
3. **Vietnamese translation** and a language switch.
4. **List a teacher's earlier test uploads** (needs an API endpoint).
5. **Download all submissions of a task as a ZIP.**
6. **httpOnly cookie sessions** instead of `localStorage` (API change).
7. **Admin screen** for teacher accounts instead of the seed script.
8. **Dark mode.**
9. **Browser end-to-end tests** (Playwright) against a disposable stack in CI.

## 10. Open questions for the customer

| # | Question | Current behaviour |
|---|---|---|
| OQ-1 | Should teachers be able to fix a typo in a closed task **without** reopening it? | The API requires a future deadline on every update, so saving a closed task reopens it. The UI warns about this. |
| OQ-2 | Should students see which teacher posted a task? | Not shown; the API returns only the teacher's id. |
| OQ-3 | Is rejecting late submissions outright the right policy, or should they be accepted and flagged as late? | Rejected (decision 5). |
| OQ-4 | Password policy: is "at least 8 characters" enough? | Only length is checked. |
| OQ-5 | How long must submitted PDFs and grades be kept after a course ends? | Kept until the task is deleted. |
| OQ-6 | Which email provider will send password resets in production? | Configurable SMTP; without it, reset codes only appear in the server log. |
| OQ-7 | Is a one-day session right? Teachers grading for hours may be signed out mid-work. | `JWT_EXPIRES_IN=1d`. |

## 11. Verification

| Area | Automated tests (`frontend/src`) | Also checked by hand |
|---|---|---|
| Auth and session (FR-AUTH) | `features/auth/auth.test.tsx` (13 tests) | Sign-in, registration and redirect-back against the real API |
| Tasks (FR-TASK) | `features/tasks/tasks.test.tsx` (14 tests) | Create task, deadline in GMT+7 |
| Submissions and grading (FR-SUB, FR-GRADE) | `features/submissions/submissions.test.tsx` (12 tests) | Upload, inline PDF preview, grading and the student's view of the grade, both on the dev servers and on the Docker stack |
| Client plumbing (errors, dates, files, tokens) | `lib/lib.test.ts`, `api/client.test.ts` (21 tests) | n/a |
| Layout (NFR-04) | n/a | 375 px phone width: no horizontal scroll |
| Container (NFR-06, NFR-10) | CI Docker build | CSP, caching, gzip, SPA fallback and API proxy with curl; PDF preview under the CSP in the browser |

The component tests run the real pages, router and data layer against a fake
API ([`src/test/handlers.ts`](../frontend/src/test/handlers.ts)) that follows
the backend's rules and error messages.
