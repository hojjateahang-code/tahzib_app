# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json  ./

# Install dependencies
RUN npm install

# Copy project source code
COPY . .

# Set build argument for Vite API base URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build application (Vite frontend + Esbuild backend server)
RUN npm run build

# ==========================================
# Stage 2: Runtime Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_PATH=/app/storage

# Copy package files for production dependencies
COPY package.json  ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built dist and public assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Ensure local storage directories exist
RUN mkdir -p /app/storage/backups /app/storage/attachments /app/storage/updates

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
