# This file is moved to the root directory before building the image

# base node image
FROM node:22-bookworm-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y fuse3 openssl sqlite3 ca-certificates

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

ADD package.json package-lock.json .npmrc ./
RUN npm ci --include=dev

# Setup production node_modules
FROM base as production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json .npmrc ./
RUN npm prune --omit=dev

# Build the app
FROM base as build

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

# Use the following environment variables to configure Sentry
# ENV SENTRY_ORG=
# ENV SENTRY_PROJECT=

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

# Copy the entire monorepo structure
ADD . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build the specific app
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
  export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
  cd apps/app && npm run build

# Finally, build the production image with minimal footprint
FROM base

ENV FLY="true"
ENV LITEFS_DIR="/litefs/data"
ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
ENV DATABASE_URL="file:$DATABASE_PATH"
ENV CACHE_DATABASE_FILENAME="cache.db"
ENV CACHE_DATABASE_PATH="$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
ENV CACHE_DATABASE_URL="file:$CACHE_DATABASE_PATH"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"
# For WAL support: https://github.com/prisma/prisma-engines/issues/4675#issuecomment-1914383246
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK="1"

# add shortcut for connecting to database CLI
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli
# and one for the cache database
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$CACHE_DATABASE_URL" > /usr/local/bin/cache-database-cli && chmod +x /usr/local/bin/cache-database-cli

WORKDIR /myapp

# Generate random value and save it to .env file which will be loaded by dotenv
RUN INTERNAL_COMMAND_TOKEN=$(openssl rand -hex 32) && \
  echo "INTERNAL_COMMAND_TOKEN=$INTERNAL_COMMAND_TOKEN" > .env

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/packages/database/node_modules/.prisma /myapp/packages/database/node_modules/.prisma

# Copy the built app
COPY --from=build /myapp/apps/app/build /myapp/apps/app/build
COPY --from=build /myapp/apps/app/package.json /myapp/apps/app/package.json
COPY --from=build /myapp/packages/database /myapp/packages/database
COPY --from=build /myapp/apps/app/app/components/ui/icons /myapp/apps/app/app/components/ui/icons

# Copy shared packages
COPY --from=build /myapp/packages /myapp/packages

# prepare for litefs
COPY --from=flyio/litefs:0.5.11 /usr/local/bin/litefs /usr/local/bin/litefs
ADD apps/app/other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

# Copy the app-specific files
COPY --from=build /myapp/apps/app /myapp/apps/app

# Set working directory to the app
WORKDIR /myapp/apps/app

CMD ["litefs", "mount"]
