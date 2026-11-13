# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /workspace

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json nx.json ./
RUN pnpm fetch --frozen-lockfile

COPY . .
RUN pnpm install --offline --frozen-lockfile
ARG GIT_COMMIT
RUN pnpm nx run @useairfoil/producer-incident-io:build
RUN pnpm --config.inject-workspace-packages=true \
  --filter @useairfoil/producer-incident-io deploy --prod /connector

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=node:node /connector ./

USER node

EXPOSE 8080

ENTRYPOINT ["node", "dist/main.mjs"]
CMD ["start"]
