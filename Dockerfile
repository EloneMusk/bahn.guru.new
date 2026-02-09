FROM node:20-alpine AS build

WORKDIR /app-src

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile=false

COPY src ./src
COPY assets ./assets
RUN pnpm run build && pnpm prune --prod

FROM node:20-alpine AS runtime

WORKDIR /app-src

COPY --from=build /app-src/package.json ./package.json
COPY --from=build /app-src/src ./src
COPY --from=build /app-src/assets ./assets
COPY --from=build /app-src/node_modules ./node_modules

ENV PORT=3000
ENV DB_PROFILE=db
ENV DB_USER_AGENT=bahn.guru-v2
ENV BESTPRICE=1
ENV ALLOW_PRICELESS=0
ENV ANALYTICS=false
ENV ANALYTICS_ID=

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]
