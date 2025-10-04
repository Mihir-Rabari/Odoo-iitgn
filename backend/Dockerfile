# Backend Dockerfile for Expe
# Use Debian slim to ensure sharp has libvips available
FROM node:18-bullseye-slim AS base

# Install system dependencies (curl for healthcheck, libvips for sharp)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libvips \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
# Defaults overridden in docker-compose
ENV DATABASE_URL=postgresql://expe_user:expe_password@postgres:5432/expe_db
ENV REDIS_URL=redis://redis:6379
ENV FRONTEND_URL=http://localhost:8080
ENV UPLOAD_PATH=/app/uploads

# Ensure uploads dir exists
RUN mkdir -p /app/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
