# Express example

This application consumes only the public `@inflowapm/node` package API. It demonstrates root routes, normalized parameter routes in a mounted router, POST and slow responses, HTTP 500 telemetry, a privacy-safe unmatched route, and application-owned shutdown signals.

Build the SDK, provide a project API key, and start the example:

```bash
cd sdks/node
npm run build
INFLOWAPM_API_KEY="your-local-project-key" \
INFLOWAPM_ENDPOINT="http://127.0.0.1:5002" \
node examples/express/server.mjs
```

The application listens on `127.0.0.1:3001` by default. The InflowAPM backend endpoint is independently configurable and may use localhost, a self-hosted base path, or HTTPS.

Example requests:

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/api/products/123
curl -X POST -H 'Content-Type: application/json' -d '{"cart":"demo"}' http://127.0.0.1:3001/checkout
curl http://127.0.0.1:3001/slow
curl http://127.0.0.1:3001/error
```

This remains a repository example until the controlled first npm publication is explicitly approved.
