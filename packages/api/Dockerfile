FROM node:22

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/web/package.json ./web/
COPY packages/api/package.json ./api/
COPY packages/types/package.json ./types/

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn workspace @shoppingo/types build

RUN yarn workspace @shoppingo/api build

EXPOSE 4001
CMD ["node", "/app/packages/api/build/index.js"]

