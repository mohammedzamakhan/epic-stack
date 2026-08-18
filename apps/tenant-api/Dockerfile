# Build from the monorepo root:
#   flyctl deploy --config apps/tenant-api/fly.toml --dockerfile apps/tenant-api/Dockerfile

FROM node:22-bookworm-slim AS base

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y fuse3 openssl sqlite3 ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /myapp

ADD package.json package-lock.json .npmrc ./
RUN npm ci --include=dev

FROM base AS build

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD . .

RUN cd packages/database && npx prisma generate

FROM base

ENV FLY="true"
ENV LITEFS_DIR="/litefs/data"
ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
ENV DATABASE_URL="file:$DATABASE_PATH"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK="1"

RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli \
	&& chmod +x /usr/local/bin/database-cli

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/packages /myapp/packages
COPY --from=build /myapp/apps/tenant-api /myapp/apps/tenant-api
COPY --from=build /myapp/package.json /myapp/package.json

COPY --from=flyio/litefs:0.5.11 /usr/local/bin/litefs /usr/local/bin/litefs
ADD apps/tenant-api/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

WORKDIR /myapp/apps/tenant-api

CMD ["litefs", "mount"]
