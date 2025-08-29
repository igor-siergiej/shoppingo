FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY .yarnrc.yml ./.yarnrc.yml

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

COPY . .

RUN --mount=type=secret,id=PAT_TOKEN,required \
  sh -c 'export PAT_TOKEN="$(cat /run/secrets/PAT_TOKEN)" && yarn workspace @shoppingo/api build'

FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the built application
COPY --from=builder /app/packages/api/build ./build

EXPOSE 4001

CMD ["node", "build/index.js"]

