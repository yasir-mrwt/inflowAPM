import { absoluteUrl } from "@/lib/site";

export function GET() {
  const content = `# InflowAPM

> InflowAPM is an open-source application performance monitoring project for understanding server-side request latency, errors, throughput, and normalized route health.

## Canonical pages

- Homepage: ${absoluteUrl("/")}
- Node.js SDK documentation: ${absoluteUrl("/docs")}
- Source repository: https://github.com/yasir-mrwt/inflowAPM
- Node.js package source: https://github.com/yasir-mrwt/inflowAPM/tree/main/sdks/node

## Current SDK

- Package name: @inflowapm/node
- Version: 0.1.0
- License: MIT
- Runtime: server-side Node.js 24 or newer
- Express support: 4.18 or newer and 5.x
- Status: release-ready, but not yet public on npm

The SDK provides automatic Express HTTP telemetry, supported manual events, bounded in-memory buffering, retrying batch delivery, explicit flush and shutdown, and fail-open behavior. It does not provide browser or mobile instrumentation, automatic stack-trace collection, or Python support.

## Architecture

Applications send project-key-authenticated telemetry to the InflowAPM ingestion API. The backend processes accepted batches asynchronously with BullMQ, stores project-scoped telemetry in PostgreSQL, and exposes analytics through its authenticated API.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
