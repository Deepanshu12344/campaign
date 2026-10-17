# ==============================================================================
# Multi-stage Dockerfile for Campaigns API
# Small, secure, non-root production container
# ==============================================================================

# --- Stage 1: Build & Bundle ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine compatibility
RUN apk add --no-cache openssl libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install dependencies across workspaces
RUN npm ci

# Copy source code
COPY packages/shared packages/shared
COPY apps/api apps/api

# Generate Prisma client and build self-contained production bundle with esbuild
WORKDIR /app/apps/api
RUN npm run build

# Remove development dependencies to keep final layer small
WORKDIR /app
RUN npm prune --omit=dev

# --- Stage 2: Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

# Install minimal runtime dependencies (OpenSSL for Prisma query engine)
RUN apk add --no-cache openssl libc6-compat dumb-init

# Copy production node_modules and Prisma schema/client
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist /app/dist
COPY --from=builder --chown=node:node /app/apps/api/prisma /app/prisma
COPY --from=builder --chown=node:node /app/apps/api/package.json /app/package.json

# Create uploads folder, ensure non-root node ownership and write permissions across /app
RUN mkdir -p /app/uploads && \
    chown -R node:node /app && \
    chmod -R 775 /app /app/uploads

# Run as non-root user
USER node

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOADS_DIR=/app/uploads

EXPOSE 4000

# Health check configuration for Docker runtime
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
