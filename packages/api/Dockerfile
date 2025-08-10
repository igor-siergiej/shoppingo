FROM node:22-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

RUN yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN yarn workspace @shoppingo/api build

FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json yarn.lock ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

RUN yarn workspaces focus @shoppingo/api --production

COPY --from=builder /app/packages/api/build ./build

EXPOSE 4001

CMD ["node", "build/index.js"]

