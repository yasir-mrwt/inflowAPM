import { performance } from "node:perf_hooks";
import type { HttpMethod, HttpTelemetryInput } from "../protocol.js";

export interface ExpressInstrumentationOptions {
  /**
   * Static normalized mount prefix, for example "/api".
   * Use this when the middleware runs inside a mounted router.
   */
  readonly routePrefix?: string;
}

export interface ExpressRequestLike {
  readonly method: string;
  readonly route?: {
    readonly path?: unknown;
  };
}

export interface ExpressResponseLike {
  readonly statusCode: number;
  once(event: "finish" | "close", listener: () => void): unknown;
  removeListener(event: "finish" | "close", listener: () => void): unknown;
}

export type ExpressNextFunction = () => void;

export type ExpressMiddleware = (
  request: ExpressRequestLike,
  response: ExpressResponseLike,
  next: ExpressNextFunction,
) => void;

type CaptureHttpEvent = (event: HttpTelemetryInput) => void;

const SUPPORTED_METHODS = new Set<HttpMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);
const UNMATCHED_ROUTE = "/__unmatched__";

function normalizePrefix(value: unknown): string {
  if (
    typeof value !== "string" ||
    value === "" ||
    value === "/" ||
    !value.startsWith("/") ||
    value.includes("?") ||
    value.includes("#") ||
    value.length > 512
  ) {
    return "";
  }
  return value.replace(/\/+$/u, "");
}

function routePath(request: ExpressRequestLike): string | undefined {
  const path = request.route?.path;
  if (typeof path === "string") return path;
  if (Array.isArray(path)) {
    return path.find((candidate): candidate is string => {
      return typeof candidate === "string";
    });
  }
  return undefined;
}

function joinRoute(prefix: string, route: string): string {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  if (prefix === "") return normalizedRoute;
  if (normalizedRoute === "/") return prefix;
  return `${prefix}${normalizedRoute}`;
}

export function createExpressMiddleware(
  isEnabled: () => boolean,
  capture: CaptureHttpEvent,
  options: ExpressInstrumentationOptions = {},
): ExpressMiddleware {
  const prefix = normalizePrefix(options.routePrefix);
  const instrumentedRequests = new WeakSet<object>();

  return (request, response, next) => {
    if (!isEnabled() || instrumentedRequests.has(request)) {
      next();
      return;
    }
    instrumentedRequests.add(request);

    const method =
      typeof request.method === "string"
        ? request.method.toUpperCase()
        : "";
    if (!SUPPORTED_METHODS.has(method as HttpMethod)) {
      next();
      return;
    }

    const occurredAt = new Date();
    const startedAt = performance.now();
    let recorded = false;

    const record = (responseFinished: boolean) => {
      if (recorded) return;
      recorded = true;
      response.removeListener("finish", onFinish);
      response.removeListener("close", onClose);

      try {
        const matchedRoute = routePath(request);
        capture({
          type: "http",
          method: method as HttpMethod,
          route:
            matchedRoute === undefined
              ? UNMATCHED_ROUTE
              : joinRoute(prefix, matchedRoute),
          status: response.statusCode,
          durationMs: Math.max(0, performance.now() - startedAt),
          occurredAt,
          ...(responseFinished
            ? {}
            : { metadata: { response_finished: false } }),
        });
      } catch {
        // Instrumentation must never escape from a response lifecycle callback.
      }
    };
    const onFinish = () => record(true);
    const onClose = () => record(false);

    try {
      response.once("finish", onFinish);
      response.once("close", onClose);
    } catch {
      // A non-standard response object must not prevent the middleware chain.
    }
    next();
  };
}
