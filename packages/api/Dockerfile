FROM node:22-alpine AS builder

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

# Install only necessary packages and create user in one layer
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package.json yarn.lock ./

COPY packages/types/package.json packages/types/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

ENV YARN_NODE_LINKER=node-modules

RUN corepack enable && corepack prepare yarn@4.9.2 --activate && \
    yarn workspaces focus @shoppingo/api --production && \
    yarn cache clean && \
    rm -rf /root/.cache

# Copy only the built application
COPY --from=builder /app/packages/api/build ./build

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/index.js"]

