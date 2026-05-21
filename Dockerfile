# Stage 1: Build Frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
# Ensure no Prisma 7 config files interfere
RUN rm -f prisma.config.js prisma.config.ts || true
RUN npx prisma generate
RUN npm run build

# Stage 3: Runtime
FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Environment variables
ENV PORT=3000
ENV DATABASE_URL="file:/data/database.db"
ENV NODE_ENV=production

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 3000

WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
