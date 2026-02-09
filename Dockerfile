FROM node:18-alpine
RUN npm i -g pnpm@7

WORKDIR /app-src
COPY assets ./assets

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY src ./src
RUN pnpm run build

USER node

ENV PORT=3000
ENV API="bahn"
ENV DB_PROFILE=db
ENV DB_USER_AGENT=bahn.guru-v2
ENV BESTPRICE=1
ENV ALLOW_PRICELESS=0
ENV ANALYTICS=false
ENV ANALYTICS_ID=

CMD ["pnpm", "run", "start"]
