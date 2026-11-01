# Deployment and operations

How code gets from a pull request to users, how to set up a server, and how
to run it day to day.

## Environments

| Environment | Updated by | Images | Approval |
|---|---|---|---|
| Local | `npm run dev` or `docker compose up --build` | built locally | n/a |
| Staging | every merge to `main` | `:sha-<7 chars>` | none |
| Production | every tag `vX.Y.Z` | `:X.Y.Z` | required reviewers on the `production` environment |

Staging and production can be two servers or two directories on one server;
each has its own `.env`, database and uploads volume.

## Pipeline

| Workflow | Trigger | Jobs |
|---|---|---|
| [`ci.yml`](../.github/workflows/ci.yml) | pull request, manual, called by CD | **Backend**: `npm ci`, production dependency audit, Prisma generate, migrations on a throwaway Postgres, typecheck, build, integration tests. **Frontend**: `npm ci`, audit, lint, typecheck, tests, build (artifact kept 7 days). **Docker** (pull requests): both images must build. |
| [`cd.yml`](../.github/workflows/cd.yml) | push to `main`, tag `v*.*.*`, manual | runs CI, then **publishes** `ghcr.io/<owner>/gradehub-backend` and `gradehub-frontend`, then **deploys** over SSH and smoke-tests the site |
| [`dependabot.yml`](../.github/dependabot.yml) | weekly / monthly | grouped update pull requests for npm, Docker base images and Actions |

Image tags: `main` and `sha-xxxxxxx` for every merge; `X.Y.Z`, `X.Y` and
`latest` for releases.

The deploy step on the server is just:

```bash
cd $DEPLOY_PATH
export IMAGE_TAG=<tag>
docker compose pull backend frontend
docker compose up -d --wait     # waits for health checks
docker image prune -f
```

followed by a smoke test from the runner: `GET /healthz` must answer 200 and
`GET /api/auth/me` must answer 401 (the API is reachable through nginx).

## One-time GitHub setup

1. **Branch protection** on `main`: require the *CI / Backend*, *CI / Frontend*
   and *CI / Docker images build* checks, and a review.
2. **Environments** (*Settings → Environments*): create `staging` and
   `production`. On `production`, add required reviewers and limit
   deployments to tags `v*`.
3. **Secrets** per environment:

   | Secret | Value |
   |---|---|
   | `DEPLOY_HOST` | server hostname or IP |
   | `DEPLOY_USER` | SSH user allowed to run `docker` |
   | `DEPLOY_SSH_KEY` | private key of a key pair made for deployments only |

4. **Variables** per environment:

   | Variable | Example |
   |---|---|
   | `APP_URL` | `https://grading.example.edu` |
   | `DEPLOY_PATH` | `/opt/gradehub` |
   | `DEPLOY_SSH_PORT` | `22` (optional) |

5. **Repository variable** `DEPLOY_ENABLED` = `true` switches the deploy jobs
   on. Until then, CD stops after publishing images.
6. **Packages:** after the first publish, the two packages appear under the
   owner's *Packages*. Either make them public, or log the server in (next
   section) with a token that has `read:packages`.

## Server setup

Requirements: Linux, Docker Engine with the Compose plugin, 1 vCPU / 1 GB RAM
minimum, disk for the database and PDFs (10 MB × students × tasks, worst case).

```bash
sudo mkdir -p /opt/gradehub && sudo chown "$USER" /opt/gradehub && cd /opt/gradehub

# The compose file and the settings template, from the release you deploy.
curl -fsSLO https://raw.githubusercontent.com/yuhnt/GradeHub/main/docker-compose.yml
curl -fsSL -o .env https://raw.githubusercontent.com/yuhnt/GradeHub/main/.env.example
chmod 600 .env
```

Edit `.env`:

- `APP_URL`: the public address, used in reset links.
- `DB_PASSWORD`: `openssl rand -hex 24` (letters and digits only; it goes in a URL).
- `JWT_SECRET`: `openssl rand -base64 48`. Changing it later signs everyone out.
- `SMTP_*` and `MAIL_FROM` for password reset emails.
- `HTTP_PORT`: the port nginx listens on (see TLS below).

If the packages are private: `echo <token> | docker login ghcr.io -u <github-user> --password-stdin`.

Start it and create the first teacher:

```bash
docker compose pull
docker compose up -d --wait
docker compose exec backend node dist/scripts/seed-teacher.js \
  --username=drhossam --email=hossam@example.edu --password='<temporary password>'
```

The teacher should then change that password with *Forgot password* (the
command line keeps it in your shell history; clear it with `history -d`).

### TLS

The frontend container speaks plain HTTP. Put it behind something that
terminates TLS, for example Caddy on the host:

```
grading.example.edu {
    reverse_proxy localhost:8080
    request_body {
        max_size 11MB
    }
}
```

or a cloud load balancer. Keep `HTTP_PORT` bound to localhost or firewalled
so the plain-HTTP port isn't reachable from outside.

## Releasing

1. Update [CHANGELOG.md](../CHANGELOG.md): move *Unreleased* under the new version.
2. Bump `version` in `backend/package.json` and `frontend/package.json`.
3. Merge to `main`, check staging.
4. Tag and push: `git tag v1.1.0 && git push origin v1.1.0`.
5. Approve the *production* deployment in the Actions run.

## Rollback

Every release stays in the registry. On the server:

```bash
cd /opt/gradehub
IMAGE_TAG=1.0.3 docker compose up -d --wait     # the last good version
```

Or re-run the *Deploy to production* job of an older tag from the Actions
page. Migrations only ever add; if a release added one, the older backend
keeps working with the newer schema unless the changelog says otherwise.

## Backups

Two things hold data: the `db-data` volume and the `uploads` volume. Back up
both, together, at least daily, and copy them off the server.

```bash
cd /opt/gradehub && mkdir -p backup
stamp=$(date +%F)
docker compose exec -T db pg_dump -U gradehub -Fc gradehub > "backup/db-$stamp.dump"
docker run --rm -v gradehub_uploads:/data -v "$PWD/backup":/backup alpine \
  tar czf "/backup/uploads-$stamp.tar.gz" -C /data .
```

Restore (into a stopped stack):

```bash
docker compose stop backend frontend
docker compose exec -T db pg_restore -U gradehub -d gradehub --clean --if-exists < backup/db-2026-09-18.dump
docker run --rm -v gradehub_uploads:/data -v "$PWD/backup":/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/uploads-2026-09-18.tar.gz -C /data"
docker compose up -d --wait
```

Test a restore on staging before you need one.

## Day-to-day operations

| Task | Command |
|---|---|
| Status and health | `docker compose ps` |
| Logs | `docker compose logs -f backend` (errors, reset tokens when SMTP is off) · `docker compose logs -f frontend` (access log) |
| Add a teacher | `docker compose exec backend node dist/scripts/seed-teacher.js --username=… --email=… --password=…` |
| Database shell | `docker compose exec db psql -U gradehub gradehub` |
| Restart one service | `docker compose restart backend` |
| Disk used by PDFs | `docker run --rm -v gradehub_uploads:/d alpine du -sh /d` |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `backend` never gets healthy | Wrong `DB_PASSWORD` (special characters?) or migrations failed. `docker compose logs backend`. |
| Everyone is signed out after a deploy | `JWT_SECRET` changed. |
| Uploads fail with "file too large" below 10 MB | A proxy in front limits request bodies; allow 11 MB. |
| Reset emails never arrive | SMTP settings; with `SMTP_HOST` empty the token is only in `docker compose logs backend`. |
| Deploy job: `permission denied` on docker | The SSH user isn't in the `docker` group. |
| Deploy job: `unauthorized` pulling images | Private packages and the server isn't logged in to ghcr.io. |
