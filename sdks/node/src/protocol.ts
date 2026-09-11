export const SDK_NAME = "@inflowapm/node";
export const SDK_VERSION = "0.1.0";
export const TELEMETRY_PROTOCOL_VERSION = "1";

export const MAX_BACKEND_BATCH_SIZE = 100;
export const MAX_REQUEST_BODY_BYTES = 90 * 1024;
export const MAX_EVENT_BYTES = 16 * 1024;
export const RESERVED_METADATA_KEY = "inflow";

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type TelemetryMetadata = Readonly<Record<string, JsonValue>>;

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type ApplicationEventRoute = "query" | "error" | "timeout";

export interface TelemetryIdentity {
  readonly user_id?: string;
  readonly anonymous_id?: string;
  readonly email?: string;
  readonly ip?: string;
}

export interface HttpTelemetryEvent extends TelemetryIdentity {
  readonly type: "http";
  readonly route: string;
  readonly method: HttpMethod;
  readonly status: number;
  readonly duration_ms: number;
  readonly metadata: TelemetryMetadata;
  readonly occurred_at: string;
}

export interface ApplicationTelemetryEvent extends TelemetryIdentity {
  readonly type: "event";
  readonly route: ApplicationEventRoute;
  readonly duration_ms?: number;
  readonly metadata: TelemetryMetadata;
  readonly occurred_at: string;
}

export type TelemetryEvent = HttpTelemetryEvent | ApplicationTelemetryEvent;
export type TelemetryBatch = readonly TelemetryEvent[];

export interface InflowProtocolMetadata {
  readonly protocol_version: typeof TELEMETRY_PROTOCOL_VERSION;
  readonly service: {
    readonly name: string;
    readonly version?: string;
  };
  readonly environment: string;
  readonly runtime: {
    readonly name: "node";
    readonly version: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  };
  readonly sdk: {
    readonly name: typeof SDK_NAME;
    readonly version: typeof SDK_VERSION;
  };
}

export interface TelemetryIdentityInput {
  readonly userId?: string;
  readonly anonymousId?: string;
  readonly email?: string;
  readonly ip?: string;
}

export interface HttpTelemetryInput extends TelemetryIdentityInput {
  readonly type: "http";
  readonly route: string;
  readonly method: HttpMethod;
  readonly status: number;
  readonly durationMs: number;
  readonly metadata?: TelemetryMetadata;
  readonly occurredAt?: Date | string;
}

export interface ApplicationTelemetryInput extends TelemetryIdentityInput {
  readonly type: "event";
  readonly route: ApplicationEventRoute;
  readonly durationMs?: number;
  readonly metadata?: TelemetryMetadata;
  readonly occurredAt?: Date | string;
}

export type TelemetryInput = HttpTelemetryInput | ApplicationTelemetryInput;
