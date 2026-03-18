FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb .bunfig.toml ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ARG NODE_AUTH_TOKEN

RUN NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN} bun install --frozen-lockfile

COPY . .

RUN NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN} bun install --frozen-lockfile

RUN bun run --filter @shoppingo/api build

FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the built application
COPY --from=builder /app/packages/api/build ./build

# Copy sharp and its native binaries from the builder (same Alpine base ensures musl compatibility)
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img

EXPOSE 4001

CMD ["node", "build/index.js"]
