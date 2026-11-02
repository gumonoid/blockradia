FROM node:22-alpine
WORKDIR /app
COPY package.json package.json
COPY app/api/explorer/route.ts app/api/explorer/route.ts
COPY lib/solana-throttle.ts lib/solana-throttle.ts
COPY lib/remote-explorer.ts lib/remote-explorer.ts
COPY lib/alchemy.ts lib/alchemy.ts
COPY server/ server/
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "--experimental-strip-types", "server/start.mjs"]
