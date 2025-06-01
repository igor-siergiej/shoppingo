FROM node:22 AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/web/package.json ./web/
COPY packages/api/package.json ./api/
COPY packages/types/package.json ./types/

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn workspace @shoppingo/types build

RUN yarn workspace @shoppingo/web build

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
