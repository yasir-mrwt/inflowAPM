import type { ResolvedConfiguration } from "./config.js";
import type { TelemetryBatch } from "./protocol.js";
import type {
  TelemetryTransport,
  TransportFailure,
  TransportResult,
} from "./transport.js";

export interface DeliveryResult {
  readonly outcome: TransportResult;
  readonly attempts: number;
  readonly retryAttempts: number;
  readonly rateLimitResponses: number;
}

export type RetryObserver = (
  failure: TransportFailure,
  delayMs: number,
) => void;

function isRetryable(failure: TransportFailure): boolean {
  return (
    failure.kind === "network_error" ||
    failure.kind === "timeout" ||
    failure.kind === "rate_limited" ||
    failure.kind === "server_error"
  );
}

function randomInteger(maximumInclusive: number): number {
  if (maximumInclusive <= 0) return 0;
  return Math.floor(Math.random() * (maximumInclusive + 1));
}

function retryDelay(
  failure: TransportFailure,
  retryNumber: number,
  configuration: ResolvedConfiguration,
): number {
  if (
    failure.kind === "rate_limited" &&
    failure.retryAfterMs !== undefined
  ) {
    const base = Math.min(
      failure.retryAfterMs,
      configuration.retryMaxDelayMs,
    );
    const headroom = configuration.retryMaxDelayMs - base;
    return base + randomInteger(Math.min(250, headroom));
  }

  const exponentialCap = Math.min(
    configuration.retryMaxDelayMs,
    configuration.retryBaseDelayMs * 2 ** (retryNumber - 1),
  );
  return randomInteger(exponentialCap);
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const finish = (completed: boolean) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(true), delayMs);
    timer.unref();
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function deliverWithRetry(
  transport: TelemetryTransport,
  batch: TelemetryBatch,
  configuration: ResolvedConfiguration,
  signal: AbortSignal,
  observeRetry: RetryObserver,
): Promise<DeliveryResult> {
  let attempts = 0;
  let retryAttempts = 0;
  let rateLimitResponses = 0;

  while (attempts < configuration.maxAttempts) {
    attempts += 1;
    const outcome = await transport.send(batch, signal);
    if (outcome.ok) {
      return { outcome, attempts, retryAttempts, rateLimitResponses };
    }
    if (outcome.failure.kind === "rate_limited") {
      rateLimitResponses += 1;
    }
    if (
      signal.aborted ||
      !isRetryable(outcome.failure) ||
      attempts >= configuration.maxAttempts
    ) {
      return { outcome, attempts, retryAttempts, rateLimitResponses };
    }

    const delayMs = retryDelay(outcome.failure, attempts, configuration);
    retryAttempts += 1;
    observeRetry(outcome.failure, delayMs);
    if (!(await waitForRetry(delayMs, signal))) {
      return {
        outcome: {
          ok: false,
          failure: { kind: "cancelled" },
        },
        attempts,
        retryAttempts,
        rateLimitResponses,
      };
    }
  }

  return {
    outcome: { ok: false, failure: { kind: "internal_error" } },
    attempts,
    retryAttempts,
    rateLimitResponses,
  };
}
