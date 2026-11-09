# Shared BlockRadia API

The desktop application handles explorer requests inside Electron and forwards queries to `https://blockradia-api.onrender.com` by default. Provider keys stay on that service. Users need no provider accounts or keys. Set `BLOCKRADIA_API_URL` at build time to override the origin, or set it to `direct` to build a standalone direct-provider desktop package.

## Deploy on Render

1. Sign in at https://dashboard.render.com/ and connect the private `gumonoid/blockradia` repository.
2. Create a Blueprint from this repository's `render.yaml`. It defines one Free Docker web service, with `/healthz` as its health check.
3. Enter `BLOCKSCOUT_API_KEY` as a secret environment variable. Use the locally held key; never commit it or put it in the desktop build environment.
4. Wait for deployment and copy the assigned HTTPS URL. Check `/healthz` and `/api/explorer?network=arbitrum&action=overview`.
5. Build desktop packages with `BLOCKRADIA_API_URL` set to that origin, for example `https://your-assigned-service.onrender.com`. The build writes only the public origin into `desktop/service.json`. All packages built this way use the shared service automatically.

No release is created by these steps unless an existing publishing workflow is explicitly run. The version has not been changed.

Free Render services sleep after 15 idle minutes and can take about a minute to wake. Existing client deadlines may end the first request; retry after startup. Free hosting is for preview, not a guarantee of availability for public production use. Provider plans and quotas still apply. Base and Polygon wallet histories use `ALCHEMY_API_KEY`, stored only in the server environment; enable both Mainnet endpoints in that Alchemy app. Their overview uses growthepie for daily network transactions and daily active addresses, with an explicit UTC date. Series are cached for an hour, exclude the unfinished current UTC day, and are rejected when the newest point is older than three days. Two requests per network per hour keep normal single-instance usage below growthepie's public guidance of 10 requests per minute. Recent-block transactions remain independently available through RPC. Public BaseScan/PolygonScan CSV exports were tested but blocked from the hosting network, so they are not used.

## Run locally

With Node.js 22.13+:

```sh
node --env-file=.env.local --experimental-strip-types server/start.mjs
```

The server binds to port 8080 (`PORT` overrides it). For the desktop preview, set `BLOCKRADIA_API_URL=http://127.0.0.1:8080` before building. The source API route uses direct providers unless `BLOCKRADIA_API_URL` is set; the packaged desktop app loads its service origin from generated `desktop/service.json`.

## Docker / other hosts

```sh
docker build -t blockradia-api .
docker run --rm --env-file .env.local -p 8080:8080 blockradia-api
```

Terminate HTTPS at the hosting proxy. `TRUST_PROXY=true` is reserved for a trusted proxy that supplies the real client address; otherwise leave it unset. Never expose a proxy-trusting instance directly to the internet.

## Operation and privacy

Only GET requests to `/api/explorer` and `/healthz` are served. There is no general URL proxy and no wallet mutation endpoint. Parameters are validated by the existing explorer adapter. Rate limits default to 60 requests per minute and four active requests per client, with 16 active requests per instance. The shared request budget defaults to 600 requests per minute per instance and can be set through `API_REQUESTS_PER_MINUTE`. Overload returns 429 with a retry delay. Existing request deduplication, provider pacing and bounded in-memory caches are shared across users in that process. Multiple replicas have separate caches and limits.

The service receives searched public addresses, network choices and client IP addresses. History, bookmarks and nicknames stay on the user's computer. Application code does not log requests or credentials; hosting platforms may retain access logs. A public API has no embedded client secret: a distributable desktop app cannot keep one private. Capacity and provider quotas must be monitored before a larger public rollout.

References: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Free service limits](https://render.com/docs/free).
