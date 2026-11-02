# Shared BlockRadia API

The desktop application keeps its loopback API and forwards queries to one configured HTTPS service. Provider keys stay on that service. Users need no provider accounts or keys. No service has been published yet: deployment requires the owner's hosting account and an assigned URL.

## Deploy on Render

1. Sign in at https://dashboard.render.com/ and connect the private `gumonoid/blockradia` repository.
2. Create a Blueprint from this repository's `render.yaml`. It defines one Free Docker web service, with `/healthz` as its health check.
3. Enter `BLOCKSCOUT_API_KEY` as a secret environment variable. Use the locally held key; never commit it or put it in the desktop build environment.
4. Wait for deployment and copy the assigned HTTPS URL. Check `/healthz` and `/api/explorer?network=arbitrum&action=overview`.
5. Build desktop packages with `BLOCKRADIA_API_URL` set to that origin, for example `https://your-assigned-service.onrender.com`. The build writes only the public origin into `desktop/service.json`. All packages built this way use the shared service automatically.

No release is created by these steps unless an existing publishing workflow is explicitly run. The version has not been changed.

Free Render services sleep after 15 idle minutes and can take about a minute to wake. Existing client deadlines may end the first request; retry after startup. Free hosting is for preview, not a guarantee of availability for public production use. Provider plans and quotas still apply: sharing the key does not unlock Base or Polygon on the current Blockscout plan. Those networks remain disabled.

## Run locally

With Node.js 22.13+:

```sh
node --env-file=.env.local --experimental-strip-types server/start.mjs
```

The server binds to port 8080 (`PORT` overrides it). For the desktop preview, set `BLOCKRADIA_API_URL=http://127.0.0.1:8080` before launching or building. Without a configured service URL the app retains its direct-provider mode. Do not distribute a package until its real shared-service URL has been set and tested.

## Docker / other hosts

```sh
docker build -t blockradia-api .
docker run --rm --env-file .env.local -p 8080:8080 blockradia-api
```

Terminate HTTPS at the hosting proxy. `TRUST_PROXY=true` is reserved for a trusted proxy that supplies the real client address; otherwise leave it unset. Never expose a proxy-trusting instance directly to the internet.

## Operation and privacy

Only GET requests to `/api/explorer` and `/healthz` are served. There is no general URL proxy and no wallet mutation endpoint. Parameters are validated by the existing explorer adapter. Rate limits default to 60 requests per minute per client and 16 active requests per instance; overload returns 429. Existing request deduplication, provider pacing and bounded in-memory caches are shared across users in that process. Multiple replicas have separate caches and limits.

The service receives searched public addresses, network choices and client IP addresses. History, bookmarks and nicknames stay on the user's computer. Application code does not log requests or credentials; hosting platforms may retain access logs. A public API has no embedded client secret: a distributable desktop app cannot keep one private. Capacity and provider quotas must be monitored before a larger public rollout.

References: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Free service limits](https://render.com/docs/free).
