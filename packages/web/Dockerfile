FROM node:22 AS builder

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

WORKDIR /app

COPY package.json yarn.lock ./
COPY .yarnrc.yml ./.yarnrc.yml

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Configure GitHub Packages authentication
RUN --mount=type=secret,id=GITHUB_TOKEN \
    yarn config set npmScopes.imapps.npmRegistryServer "https://npm.pkg.github.com" && \
    yarn config set npmScopes.imapps.npmAuthToken "$(cat /run/secrets/GITHUB_TOKEN)"

RUN yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN APP_VERSION="$APP_VERSION" yarn workspace @shoppingo/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
