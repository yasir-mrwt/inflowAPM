import { MAX_BACKEND_BATCH_SIZE } from "./protocol.js";

export type ConfigurationIssueCode =
  | "invalid_options"
  | "invalid_api_key"
  | "invalid_endpoint"
  | "invalid_service"
  | "invalid_environment"
  | "invalid_service_version"
  | "invalid_enabled"
  | "invalid_debug"
  | "invalid_batch_size"
  | "invalid_buffer_size"
  | "invalid_flush_threshold"
  | "invalid_flush_interval"
  | "invalid_request_timeout"
  | "invalid_max_attempts"
  | "invalid_retry_delay"
  | "invalid_shutdown_timeout";

export interface ConfigurationIssue {
  readonly code: ConfigurationIssueCode;
  readonly message: string;
}

export interface InflowAPMOptions {
  readonly apiKey: string;
  /** Base URL of hosted or self-hosted InflowAPM, without the ingestion path. */
  readonly endpoint: string;
  readonly service: string;
  readonly environment: string;
  readonly serviceVersion?: string;
  readonly enabled?: boolean;
  readonly batchSize?: number;
  readonly maxBufferSize?: number;
  readonly flushThreshold?: number;
  readonly flushIntervalMs?: number;
  readonly requestTimeoutMs?: number;
  readonly maxAttempts?: number;
  readonly retryBaseDelayMs?: number;
  readonly retryMaxDelayMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly debug?: boolean;
}

export interface ResolvedConfiguration {
  readonly apiKey: string;
  readonly ingestionUrl: string;
  readonly service: string;
  readonly environment: string;
  readonly serviceVersion?: string;
  readonly enabled: boolean;
  readonly batchSize: number;
  readonly maxBufferSize: number;
  readonly flushThreshold: number;
  readonly flushIntervalMs: number;
  readonly requestTimeoutMs: number;
  readonly maxAttempts: number;
  readonly retryBaseDelayMs: number;
  readonly retryMaxDelayMs: number;
  readonly shutdownTimeoutMs: number;
  readonly debug: boolean;
}

export interface ConfigurationResolution {
  readonly configuration?: ResolvedConfiguration;
  readonly issue?: ConfigurationIssue;
  readonly debug: boolean;
}

const DEFAULT_BATCH_SIZE = MAX_BACKEND_BATCH_SIZE;
const DEFAULT_MAX_BUFFER_SIZE = 1_000;
const DEFAULT_FLUSH_INTERVAL_MS = 5_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 200;
const DEFAULT_RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;

function issue(
  code: ConfigurationIssueCode,
  message: string,
  debug: boolean,
): ConfigurationResolution {
  return { issue: { code, message }, debug };
}

function boundedString(
  value: unknown,
  maximumLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    return undefined;
  }
  return normalized;
}

function positiveInteger(value: unknown, fallback: number): number | undefined {
  const candidate = value === undefined ? fallback : value;
  return typeof candidate === "number" &&
    Number.isSafeInteger(candidate) &&
    candidate > 0
    ? candidate
    : undefined;
}

export function resolveConfiguration(input: unknown): ConfigurationResolution {
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : undefined;
  const debug = raw?.debug === true;

  if (!raw) {
    return issue(
      "invalid_options",
      "Configuration must be a non-null object.",
      debug,
    );
  }

  if (raw.debug !== undefined && typeof raw.debug !== "boolean") {
    return issue("invalid_debug", "debug must be a boolean when set.", false);
  }
  if (raw.enabled !== undefined && typeof raw.enabled !== "boolean") {
    return issue(
      "invalid_enabled",
      "enabled must be a boolean when set.",
      debug,
    );
  }

  const apiKey = boundedString(raw.apiKey, 512);
  if (!apiKey || /\s/u.test(apiKey)) {
    return issue(
      "invalid_api_key",
      "apiKey must be a non-empty token without whitespace.",
      debug,
    );
  }

  const endpoint = boundedString(raw.endpoint, 2_048);
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint ?? "");
  } catch {
    return issue(
      "invalid_endpoint",
      "endpoint must be a valid HTTP or HTTPS base URL.",
      debug,
    );
  }

  if (
    !["http:", "https:"].includes(endpointUrl.protocol) ||
    endpointUrl.username !== "" ||
    endpointUrl.password !== "" ||
    endpointUrl.search !== "" ||
    endpointUrl.hash !== ""
  ) {
    return issue(
      "invalid_endpoint",
      "endpoint must be an HTTP or HTTPS base URL without credentials, query, or fragment.",
      debug,
    );
  }

  const service = boundedString(raw.service, 100);
  if (!service) {
    return issue(
      "invalid_service",
      "service must contain between 1 and 100 characters.",
      debug,
    );
  }

  const environment = boundedString(raw.environment, 64);
  if (!environment) {
    return issue(
      "invalid_environment",
      "environment must contain between 1 and 64 characters.",
      debug,
    );
  }

  const serviceVersion =
    raw.serviceVersion === undefined
      ? undefined
      : boundedString(raw.serviceVersion, 100);
  if (raw.serviceVersion !== undefined && !serviceVersion) {
    return issue(
      "invalid_service_version",
      "serviceVersion must contain between 1 and 100 characters when set.",
      debug,
    );
  }

  const batchSize = positiveInteger(raw.batchSize, DEFAULT_BATCH_SIZE);
  if (!batchSize || batchSize > MAX_BACKEND_BATCH_SIZE) {
    return issue(
      "invalid_batch_size",
      `batchSize must be an integer from 1 to ${MAX_BACKEND_BATCH_SIZE}.`,
      debug,
    );
  }

  const maxBufferSize = positiveInteger(
    raw.maxBufferSize,
    DEFAULT_MAX_BUFFER_SIZE,
  );
  if (
    !maxBufferSize ||
    maxBufferSize < batchSize ||
    maxBufferSize > 100_000
  ) {
    return issue(
      "invalid_buffer_size",
      "maxBufferSize must be an integer from batchSize to 100000.",
      debug,
    );
  }

  const flushThreshold = positiveInteger(raw.flushThreshold, batchSize);
  if (!flushThreshold || flushThreshold > maxBufferSize) {
    return issue(
      "invalid_flush_threshold",
      "flushThreshold must be an integer from 1 to maxBufferSize.",
      debug,
    );
  }

  const flushIntervalMs = positiveInteger(
    raw.flushIntervalMs,
    DEFAULT_FLUSH_INTERVAL_MS,
  );
  if (!flushIntervalMs || flushIntervalMs > 3_600_000) {
    return issue(
      "invalid_flush_interval",
      "flushIntervalMs must be an integer from 1 to 3600000.",
      debug,
    );
  }

  const requestTimeoutMs = positiveInteger(
    raw.requestTimeoutMs,
    DEFAULT_REQUEST_TIMEOUT_MS,
  );
  if (!requestTimeoutMs || requestTimeoutMs > 60_000) {
    return issue(
      "invalid_request_timeout",
      "requestTimeoutMs must be an integer from 1 to 60000.",
      debug,
    );
  }

  const maxAttempts = positiveInteger(raw.maxAttempts, DEFAULT_MAX_ATTEMPTS);
  if (!maxAttempts || maxAttempts > 10) {
    return issue(
      "invalid_max_attempts",
      "maxAttempts must be an integer from 1 to 10.",
      debug,
    );
  }

  const retryBaseDelayMs = positiveInteger(
    raw.retryBaseDelayMs,
    DEFAULT_RETRY_BASE_DELAY_MS,
  );
  const retryMaxDelayMs = positiveInteger(
    raw.retryMaxDelayMs,
    DEFAULT_RETRY_MAX_DELAY_MS,
  );
  if (
    !retryBaseDelayMs ||
    !retryMaxDelayMs ||
    retryBaseDelayMs > retryMaxDelayMs ||
    retryMaxDelayMs > 300_000
  ) {
    return issue(
      "invalid_retry_delay",
      "Retry delays must be positive integers with base <= maximum <= 300000.",
      debug,
    );
  }

  const shutdownTimeoutMs = positiveInteger(
    raw.shutdownTimeoutMs,
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
  );
  if (!shutdownTimeoutMs || shutdownTimeoutMs > 60_000) {
    return issue(
      "invalid_shutdown_timeout",
      "shutdownTimeoutMs must be an integer from 1 to 60000.",
      debug,
    );
  }

  endpointUrl.pathname = `${endpointUrl.pathname.replace(/\/+$/u, "")}/api/v1/telemetry/ingest`;

  const baseConfiguration = {
    apiKey,
    ingestionUrl: endpointUrl.toString(),
    service,
    environment,
    enabled: raw.enabled !== false,
    batchSize,
    maxBufferSize,
    flushThreshold,
    flushIntervalMs,
    requestTimeoutMs,
    maxAttempts,
    retryBaseDelayMs,
    retryMaxDelayMs,
    shutdownTimeoutMs,
    debug,
  };

  return {
    configuration:
      serviceVersion === undefined
        ? baseConfiguration
        : { ...baseConfiguration, serviceVersion },
    debug,
  };
}
