# syntax=docker/dockerfile:1

# Task Grading Hub web client: a static build served by nginx, which also
# proxies /api to the backend so the browser only ever talks to one origin.
# Build from the frontend/ directory:
#   docker build -t gradehub-frontend .

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Leave empty to call the API on the same origin (through nginx, below).
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.31-alpine AS runtime
# nginx renders templates/*.template into conf.d/ at start, filling in
# ${API_UPSTREAM} and leaving nginx's own $variables alone.
ENV API_UPSTREAM=http://backend:3000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
