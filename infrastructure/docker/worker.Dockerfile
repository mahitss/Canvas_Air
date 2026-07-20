FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile

COPY apps/worker/ ./apps/worker/

RUN pnpm --filter @visioncanvas/worker build

CMD ["pnpm", "--filter", "@visioncanvas/worker", "start"]
