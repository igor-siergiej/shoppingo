FROM node:22-alpine AS builder

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

# Fallback for tools that rely on .npmrc during tarball fetches (in addition to .yarnrc.yml)
RUN printf "//npm.pkg.github.com/:_authToken=${PAT_TOKEN}\n" > .npmrc \
 && yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN yarn workspace @shoppingo/api build

FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the built application
COPY --from=builder /app/packages/api/build ./build

EXPOSE 4001

CMD ["node", "build/index.js"]

