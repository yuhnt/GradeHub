# Task Grading Hub web client

React single-page app for students and teachers. What it does is specified
in [docs/frontend-requirements.md](../docs/frontend-requirements.md); how it
is built is in [docs/architecture.md](../docs/architecture.md#frontend).

## Run it

Needs Node.js 22.12+ and the API running on http://localhost:3000
(see [backend/README.md](../backend/README.md)).

```bash
npm install
npm run dev          # http://localhost:5173, /api is proxied to :3000
```

| Script | |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build on :4173 |
| `npm test` / `npm run test:watch` | Unit and component tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output |

### Settings

Copy `.env.example` to `.env.local` to change them.

| Variable | Default | |
|---|---|---|
| `VITE_API_URL` | empty | API origin without `/api`. Empty means same origin (dev proxy, or nginx in Docker). Set it only if the API is on another domain, and add this site to the backend's `CORS_ORIGIN`. Baked in at build time. |
| `DEV_API_PROXY_TARGET` | `http://localhost:3000` | Where `npm run dev` forwards `/api`. |

## Project structure

```
src/
  api/          client.ts (fetch wrapper: token, errors, 401 → sign out), endpoints.ts, types.ts
  auth/         AuthProvider + useAuth, route guards, token storage, JWT expiry
  components/   ui/ (Button, Field, Card, Alert, Badge, ConfirmDialog, …), layout/, domain widgets
  features/
    auth/         sign in, register, forgot/reset password
    tasks/        list, detail, create/edit; React Query hooks and keys
    submissions/  student panel, teacher table, grading page, My submissions
  lib/          dates, files (PDF checks, CSV), friendly error messages, hooks
  pages/        not found / no access / error screens
  test/         MSW fake API, in-memory data, renderApp() helper
  router.tsx    all routes, each page lazy-loaded
```

## Conventions

- **Data:** read with the hooks in `features/*/hooks.ts` (TanStack Query);
  never call `fetch` from a component. Mutations invalidate the query keys in
  `features/*/keys.ts` they affect.
- **Errors:** show `errorMessage(error)` from `lib/errors.ts`. Add a line to
  its table when the backend gains an error a user can hit.
- **Forms:** React Hook Form with a zod schema that copies the backend's
  limits. Put API errors on the field they belong to when you can.
- **Dates:** the API speaks UTC ISO strings; format with `lib/dates.ts` so
  users see their own time zone. Use `useNow()` for anything that changes
  when a deadline passes.
- **Accessibility:** use `TextField` / `TextAreaField` (they wire labels and
  error descriptions), `Button` for actions, `ConfirmDialog` for anything
  destructive. Icons get `aria-hidden`.
- **Types:** `api/types.ts` mirrors [docs/api.md](../docs/api.md). Change both
  with the backend.

## Tests

`npm test` runs everything in `src/**/*.test.ts(x)` with jsdom. Component
tests render the whole app with `renderApp(path, { as: user })`; requests go
to the fake API in `src/test/handlers.ts`, whose data (`src/test/db.ts`) is
reset before each test. When the backend changes a rule, change the fake too.

```ts
it('uploads a PDF and then shows it as submitted', async () => {
  const task = addTask();
  const { user } = renderApp(`/tasks/${task.id}`, { as: student });
  await user.upload(await screen.findByLabelText('PDF file'), pdfFile('essay.pdf'));
  await user.click(screen.getByRole('button', { name: 'Submit PDF' }));
  expect(await screen.findByText(/Handed in/)).toBeInTheDocument();
});
```

## Docker

`Dockerfile` builds the app and serves it with nginx
(`nginx/default.conf.template`): SPA fallback, `/api` proxied to
`$API_UPSTREAM` (default `http://backend:3000`), long-term caching for hashed
assets, gzip, security headers including a Content-Security-Policy
(`nginx/security-headers.conf`), and `/healthz` for health checks.

```bash
docker build -t gradehub-frontend .
docker run -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:3000 gradehub-frontend
```
