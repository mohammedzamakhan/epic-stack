# This file is used for building the Cloudflare Workers deployment
# Build from the monorepo root:
#   docker build -f apps/app/other/Dockerfile -t app .

# base node image
FROM node:22-bookworm-slim AS base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl and sqlite (for build-time operations)
RUN apt-get update && apt-get install -y openssl sqlite3 ca-certificates

# Install all node_modules, including dev dependencies
FROM base AS deps

WORKDIR /myapp

ADD package.json package-lock.json .npmrc ./
RUN npm ci --include=dev

# Setup production node_modules
FROM base AS production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json .npmrc ./
RUN npm prune --omit=dev

# Build the app
FROM base AS build

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

# Use the following environment variables to configure Sentry
# ENV SENTRY_ORG=
# ENV SENTRY_PROJECT=

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

# Copy the entire monorepo structure
ADD . .

# Build the specific app
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
  export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
  cd apps/app && npm run build

# Final production image
FROM base

ENV NODE_ENV="production"
ENV PORT="8787"

WORKDIR /myapp

# Generate random value and save it to .env file which will be loaded by varlock
RUN INTERNAL_COMMAND_TOKEN=$(openssl rand -hex 32) && \
  echo "INTERNAL_COMMAND_TOKEN=$INTERNAL_COMMAND_TOKEN" > .env

COPY --from=production-deps /myapp/node_modules /myapp/node_modules

# Copy the built app
COPY --from=build /myapp/apps/app/build /myapp/apps/app/build
COPY --from=build /myapp/apps/app/package.json /myapp/apps/app/package.json
COPY --from=build /myapp/packages/database /myapp/packages/database
COPY --from=build /myapp/apps/app/app/components/ui/icons /myapp/apps/app/app/components/ui/icons

# Copy shared packages
COPY --from=build /myapp/packages /myapp/packages

# Copy the app-specific files
COPY --from=build /myapp/apps/app /myapp/apps/app

# Set working directory to the app
WORKDIR /myapp/apps/app

# Cloudflare Workers uses the built server index
CMD ["npm", "run", "start"]