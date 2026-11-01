# syntax=docker/dockerfile:1

# Task Grading Hub API. Build from the backend/ directory:
#   docker build -t gradehub-backend .

FROM node:22-bookworm-slim AS base
WORKDIR /app
# Prisma's engines need OpenSSL at build and run time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
# The client is generated for the TypeScript build, then again after pruning
# so the production node_modules is guaranteed to contain it.
RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  && npx prisma generate

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=uploads
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json docker-entrypoint.sh ./
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
# Uploaded PDFs. Mount a volume here or they are lost with the container.
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
