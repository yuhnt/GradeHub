#!/bin/sh
# Applies pending database migrations, then starts the API.
# Set RUN_MIGRATIONS=false to skip, e.g. when a release job runs them instead.
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  ./node_modules/.bin/prisma migrate deploy
fi

exec "$@"
