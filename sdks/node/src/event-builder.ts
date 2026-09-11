import { Buffer } from "node:buffer";
import { isIP } from "node:net";
import type { ResolvedConfiguration } from "./config.js";
import {
  MAX_EVENT_BYTES,
  RESERVED_METADATA_KEY,
  SDK_NAME,
  SDK_VERSION,
  TELEMETRY_PROTOCOL_VERSION,
  type ApplicationEventRoute,
  type HttpMethod,
  type JsonValue,
  type TelemetryEvent,
  type TelemetryIdentity,
  type TelemetryMetadata,
} from "./protocol.js";

export type EventBuildIssueCode =
  | "invalid_event"
  | "invalid_route"
  | "invalid_method"
  | "invalid_status"
  | "invalid_duration"
  | "invalid_timestamp"
  | "invalid_identity"
  | "invalid_metadata"
  | "reserved_metadata_key"
  | "event_too_large";

export interface EventBuildIssue {
  readonly code: EventBuildIssueCode;
  readonly message: string;
}

export interface BuiltEvent {
  readonly event: TelemetryEvent;
  readonly serializedBytes: number;
}

export type EventBuildResult =
  | { readonly ok: true; readonly value: BuiltEvent }
  | { readonly ok: false; readonly issue: EventBuildIssue };

const HTTP_METHODS = new Set<HttpMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);
const APPLICATION_ROUTES = new Set<ApplicationEventRoute>([
  "query",
  "error",
  "timeout",
]);
const MAX_METADATA_DEPTH = 8;
const MAX_METADATA_VALUES = 1_000;
const MAX_METADATA_BYTES = 12 * 1024;

function failure(
  code: EventBuildIssueCode,
  message: string,
): EventBuildResult {
  return { ok: false, issue: { code, message } };
}

function cloneJsonValue(
  value: unknown,
  seen: WeakSet<object>,
  state: { count: number },
  depth: number,
): JsonValue {
  state.count += 1;
  if (state.count > MAX_METADATA_VALUES) {
    throw new TypeError("metadata contains too many values");
  }
  if (depth > MAX_METADATA_DEPTH) {
    throw new TypeError("metadata is nested too deeply");
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("metadata numbers must be finite");
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError("metadata must contain only JSON values");
  }
  if (seen.has(value)) throw new TypeError("metadata cannot be circular");
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => cloneJsonValue(item, seen, state, depth + 1));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("metadata objects must be plain objects");
    }

    const clone: Record<string, JsonValue> = Object.create(null) as Record<
      string,
      JsonValue
    >;
    for (const [key, item] of Object.entries(value)) {
      clone[key] = cloneJsonValue(item, seen, state, depth + 1);
    }
    return clone;
  } finally {
    seen.delete(value);
  }
}

type MetadataBuildResult =
  | { readonly ok: true; readonly value: TelemetryMetadata }
  | { readonly ok: false; readonly issue: EventBuildIssue };

function metadataFailure(
  code: EventBuildIssueCode,
  message: string,
): MetadataBuildResult {
  return { ok: false, issue: { code, message } };
}

function buildMetadata(
  metadata: unknown,
  configuration: ResolvedConfiguration,
): MetadataBuildResult {
  if (metadata !== undefined && (typeof metadata !== "object" || metadata === null)) {
    return metadataFailure(
      "invalid_metadata",
      "metadata must be a JSON object when set.",
    );
  }
  if (
    metadata !== undefined &&
    Object.prototype.hasOwnProperty.call(metadata, RESERVED_METADATA_KEY)
  ) {
    return metadataFailure(
      "reserved_metadata_key",
      `metadata.${RESERVED_METADATA_KEY} is reserved for SDK protocol identity.`,
    );
  }

  try {
    const cloned = cloneJsonValue(
      metadata ?? {},
      new WeakSet<object>(),
      { count: 0 },
      0,
    );
    if (Array.isArray(cloned) || typeof cloned !== "object" || cloned === null) {
      return metadataFailure("invalid_metadata", "metadata must be a JSON object.");
    }
    const clonedObject = cloned as Readonly<Record<string, JsonValue>>;

    const service =
      configuration.serviceVersion === undefined
        ? { name: configuration.service }
        : {
            name: configuration.service,
            version: configuration.serviceVersion,
          };

    const withProtocolIdentity: TelemetryMetadata = {
      ...clonedObject,
      inflow: {
        protocol_version: TELEMETRY_PROTOCOL_VERSION,
        service,
        environment: configuration.environment,
        runtime: {
          name: "node",
          version: process.versions.node,
          platform: process.platform,
          architecture: process.arch,
        },
        sdk: {
          name: SDK_NAME,
          version: SDK_VERSION,
        },
      },
    };

    if (Buffer.byteLength(JSON.stringify(withProtocolIdentity), "utf8") > MAX_METADATA_BYTES) {
      return metadataFailure(
        "invalid_metadata",
        `serialized metadata cannot exceed ${MAX_METADATA_BYTES} bytes.`,
      );
    }
    return { ok: true, value: withProtocolIdentity };
  } catch {
    return metadataFailure(
      "invalid_metadata",
      "metadata must be bounded, acyclic, and JSON serializable.",
    );
  }
}

function normalizeTimestamp(value: unknown): string | undefined {
  const timestamp = value === undefined ? new Date() : value;
  const date = timestamp instanceof Date ? timestamp : new Date(String(timestamp));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function optionalBoundedString(
  value: unknown,
  maximumLength: number,
): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength) {
    return null;
  }
  return value;
}

function buildIdentity(raw: Record<string, unknown>): TelemetryIdentity | undefined {
  const userId = optionalBoundedString(raw.userId, 255);
  const anonymousId = optionalBoundedString(raw.anonymousId, 255);
  const email = optionalBoundedString(raw.email, 254);
  const ip = optionalBoundedString(raw.ip, 45);

  if (
    userId === null ||
    anonymousId === null ||
    email === null ||
    ip === null ||
    (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) ||
    (ip !== undefined && isIP(ip) === 0)
  ) {
    return undefined;
  }

  return {
    ...(userId === undefined ? {} : { user_id: userId }),
    ...(anonymousId === undefined ? {} : { anonymous_id: anonymousId }),
    ...(email === undefined ? {} : { email }),
    ...(ip === undefined ? {} : { ip }),
  };
}

function isFiniteDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function buildTelemetryEvent(
  input: unknown,
  configuration: ResolvedConfiguration,
): EventBuildResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return failure("invalid_event", "event must be a non-null object.");
  }
  const raw = input as Record<string, unknown>;
  if (raw.type !== "http" && raw.type !== "event") {
    return failure("invalid_event", "event.type must be http or event.");
  }

  const timestamp = normalizeTimestamp(raw.occurredAt);
  if (!timestamp) {
    return failure("invalid_timestamp", "occurredAt must be a valid date or timestamp.");
  }

  const identity = buildIdentity(raw);
  if (!identity) {
    return failure("invalid_identity", "identity fields do not match backend limits.");
  }

  const metadata = buildMetadata(raw.metadata, configuration);
  if (!metadata.ok) return metadata;

  let event: TelemetryEvent;
  if (raw.type === "http") {
    if (
      typeof raw.route !== "string" ||
      !raw.route.startsWith("/") ||
      raw.route.length > 2_048
    ) {
      return failure(
        "invalid_route",
        "HTTP route must be slash-prefixed and at most 2048 characters.",
      );
    }
    if (typeof raw.method !== "string" || !HTTP_METHODS.has(raw.method as HttpMethod)) {
      return failure("invalid_method", "HTTP method is not supported by the backend.");
    }
    if (
      typeof raw.status !== "number" ||
      !Number.isInteger(raw.status) ||
      raw.status < 100 ||
      raw.status > 599
    ) {
      return failure("invalid_status", "HTTP status must be an integer from 100 to 599.");
    }
    if (!isFiniteDuration(raw.durationMs)) {
      return failure("invalid_duration", "durationMs must be a finite non-negative number.");
    }

    event = {
      type: "http",
      route: raw.route,
      method: raw.method as HttpMethod,
      status: raw.status,
      duration_ms: raw.durationMs,
      metadata: metadata.value,
      ...identity,
      occurred_at: timestamp,
    };
  } else {
    if (
      typeof raw.route !== "string" ||
      !APPLICATION_ROUTES.has(raw.route as ApplicationEventRoute)
    ) {
      return failure(
        "invalid_route",
        "Application event route must be query, error, or timeout.",
      );
    }
    if (raw.durationMs !== undefined && !isFiniteDuration(raw.durationMs)) {
      return failure("invalid_duration", "durationMs must be a finite non-negative number.");
    }

    event = {
      type: "event",
      route: raw.route as ApplicationEventRoute,
      ...(raw.durationMs === undefined ? {} : { duration_ms: raw.durationMs as number }),
      metadata: metadata.value,
      ...identity,
      occurred_at: timestamp,
    };
  }

  const serializedBytes = Buffer.byteLength(JSON.stringify(event), "utf8");
  if (serializedBytes > MAX_EVENT_BYTES) {
    return failure(
      "event_too_large",
      `serialized event cannot exceed ${MAX_EVENT_BYTES} bytes.`,
    );
  }
  return { ok: true, value: { event, serializedBytes } };
}
