# Stage 1: Builder
FROM node:24-bookworm AS builder

# 1) Install bash + native deps for better-sqlite3
RUN apt-get update \
  && apt-get install -y bash python3 make g++ sqlite3 libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*

# 2) Upgrade npm
RUN npm install -g npm@latest

SHELL ["/bin/bash", "-lc"]
WORKDIR /app

# 3) Copy manifests, your shadcn config, scripts (for postinstall), 
#    AND your pre‑committed src/components/ui folder
COPY package*.json ./
COPY components.json ./
COPY scripts ./scripts
COPY src/components/ui ./src/components/ui
COPY src/styles ./src/styles

# 4) Install all deps (runs postinstall: copy-swagger-ui.js)
RUN npm ci

# 5) Copy the rest of your source (pages, lib/utils, etc.)
COPY . .

ENV NODE_ENV=production

# 6) Rebuild better-sqlite3 _after_ everything is in place so its native addon
#    is compiled against the same Node.js that will run `next build`:
RUN npm rebuild better-sqlite3 --build-from-source=better-sqlite3

# 7) Finally, build your Next.js application
# Generate a temporary encryption key at build time (not stored in the final image)
RUN chmod +x ./scripts/build-key-manager.sh
RUN ENCRYPTION_KEY=$(./scripts/build-key-manager.sh) npm run build

# Stage 2: Runner
FROM node:24-bookworm AS runner

# Runtime deps only
RUN apt-get update \
  && apt-get install -y bash sqlite3 libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest
SHELL ["/bin/bash", "-lc"]
WORKDIR /app
ENV NODE_ENV=production

# Copy only the built output & static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/styles ./src/styles

# Optional data dir
RUN mkdir -p .data && chown -R node:node .data

# Create a startup script that checks for required environment variables
COPY --from=builder /app/scripts/env-manager.sh ./scripts/
RUN echo '#!/bin/bash' > /app/start.sh
RUN echo 'if [ -z "$ENCRYPTION_KEY" ]; then' >> /app/start.sh
RUN echo '  echo "ERROR: ENCRYPTION_KEY environment variable is required"' >> /app/start.sh
RUN echo '  exit 1' >> /app/start.sh
RUN echo 'fi' >> /app/start.sh
RUN echo 'exec node server.js' >> /app/start.sh
RUN chmod +x /app/start.sh
RUN cat /app/start.sh  # Debug: print file to verify it exists

USER node
EXPOSE 3000
# Directly use node as fallback in case the script isn't found
CMD ["sh", "-c", "if [ -f /app/start.sh ]; then /app/start.sh; else node server.js; fi"]
