
# Stage 1: Builder
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --production=false # Install all deps including dev for build

# Copy application source
COPY . .

# Set environment variables for build
ENV NODE_ENV production

# Build the Next.js application
RUN npm run build

# Prune development dependencies (optional, as standalone output is quite lean)
# RUN npm prune --production

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
# ENV PORT 3000 # Next.js standalone output typically uses server.js which listens on port 3000 by default

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Set the user to run the app (optional, for better security)
# USER node # Ensure the .data directory (or its mount point) is writable by this user if created by Dockerfile

EXPOSE 3000

CMD ["node", "server.js"]
