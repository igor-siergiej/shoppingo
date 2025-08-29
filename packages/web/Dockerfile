FROM node:22 AS builder

ARG VITE_AUTH_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL

WORKDIR /app

COPY package.json yarn.lock ./
COPY .yarnrc.yml ./.yarnrc.yml

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules
ARG PAT_TOKEN
ENV PAT_TOKEN=$PAT_TOKEN

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

RUN printf "//npm.pkg.github.com/:_authToken=${PAT_TOKEN}\n" > .npmrc \
 && yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN yarn workspace @shoppingo/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
