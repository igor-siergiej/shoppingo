FROM node:22-alpine AS builder

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
    GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) && \
    yarn config set npmScopes.imapps.npmRegistryServer "https://npm.pkg.github.com" && \
    yarn config set npmScopes.imapps.npmAuthToken "$GITHUB_TOKEN"

RUN yarn install --immutable

COPY . .

RUN yarn install --immutable

RUN yarn workspace @shoppingo/api build

FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the built application
COPY --from=builder /app/packages/api/build ./build

RUN npm install --omit=dev --include=optional sharp

EXPOSE 4001

CMD ["node", "build/index.js"]

