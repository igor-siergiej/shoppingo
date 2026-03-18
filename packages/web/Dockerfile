FROM oven/bun:1 AS builder

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

WORKDIR /app

COPY package.json bun.lock .bunfig.toml ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ARG NODE_AUTH_TOKEN

RUN NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN} bun install --frozen-lockfile

COPY . .

RUN NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN} bun install --frozen-lockfile

RUN APP_VERSION="$APP_VERSION" bun run --filter @shoppingo/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
