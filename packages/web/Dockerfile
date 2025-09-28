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

# Configure GitLab Package Registry authentication
RUN --mount=type=secret,id=CI_JOB_TOKEN \
    CI_JOB_TOKEN=$(cat /run/secrets/CI_JOB_TOKEN) && \
    yarn config set npmScopes.imapps.npmRegistryServer "https://gitlab.com/api/v4/projects/116310254/packages/npm/" && \
    yarn config set npmScopes.imapps.npmAuthToken "$CI_JOB_TOKEN"

RUN yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN APP_VERSION="$APP_VERSION" yarn workspace @shoppingo/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
