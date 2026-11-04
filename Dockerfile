FROM node:22-alpine
WORKDIR /app
COPY package.json package.json
COPY app/api/explorer/route.ts app/api/explorer/route.ts
COPY lib/solana-throttle.ts lib/solana-throttle.ts
COPY lib/remote-explorer.ts lib/remote-explorer.ts
COPY lib/alchemy.ts lib/alchemy.ts
COPY lib/archive-history.ts lib/archive-history.ts
COPY lib/network-statistics.ts lib/network-statistics.ts
COPY lib/network-fees.ts lib/network-fees.ts
COPY lib/market-data.ts lib/market-data.ts
COPY lib/exchange-candles.ts lib/exchange-candles.ts
COPY server/ server/
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "--experimental-strip-types", "server/start.mjs"]
