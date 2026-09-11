import { BoundedBuffer } from "./buffer.js";
import {
  resolveConfiguration,
  type ConfigurationIssue,
  type ConfigurationIssueCode,
  type InflowAPMOptions,
  type ResolvedConfiguration,
} from "./config.js";
import {
  buildTelemetryEvent,
  type BuiltEvent,
  type EventBuildIssueCode,
} from "./event-builder.js";
import {
  createExpressMiddleware,
  type ExpressInstrumentationOptions,
  type ExpressMiddleware,
} from "./integrations/express.js";
import {
  MAX_REQUEST_BODY_BYTES,
  type TelemetryEvent,
  type TelemetryInput,
} from "./protocol.js";
import { deliverWithRetry } from "./retry.js";
import { FlushScheduler } from "./scheduler.js";
import {
  TelemetryTransport,
  type TransportFailure,
} from "./transport.js";

export type CaptureRejectionReason =
  | "disabled"
  | "invalid_configuration"
  | "invalid_event"
  | "buffer_full"
  | "shutdown";

export type CaptureResult =
  | {
      readonly accepted: true;
      readonly bufferedEvents: number;
    }
  | {
      readonly accepted: false;
      readonly reason: CaptureRejectionReason;
      readonly code?: EventBuildIssueCode | ConfigurationIssueCode;
      readonly bufferedEvents: number;
    };

export type FlushFailure =
  | TransportFailure
  | { readonly kind: "invalid_configuration" }
  | { readonly kind: "internal_error" }
  | { readonly kind: "lifecycle_closed" };

export interface FlushResult {
  readonly ok: boolean;
  readonly sentEvents: number;
  readonly droppedEvents: number;
  readonly pendingEvents: number;
  readonly batches: number;
  readonly failure?: FlushFailure;
}

export interface InflowAPMStats {
  readonly enabled: boolean;
  readonly capturedEvents: number;
  readonly bufferedEvents: number;
  readonly sentEvents: number;
  readonly droppedEvents: number;
  readonly retryAttempts: number;
  readonly failedBatches: number;
  readonly rateLimitedEvents: number;
  readonly configurationIssue?: ConfigurationIssue;
}

export interface ShutdownResult {
  readonly ok: boolean;
  readonly timedOut: boolean;
  readonly sentEvents: number;
  readonly droppedEvents: number;
  readonly pendingEvents: number;
  readonly failure?: FlushFailure;
}

type LifecycleState = "active" | "shutting_down" | "closed";

export class InflowAPM {
  readonly #configuration: ResolvedConfiguration | undefined;
  readonly #configurationIssue: ConfigurationIssue | undefined;
  readonly #buffer: BoundedBuffer<BuiltEvent> | undefined;
  readonly #transport: TelemetryTransport | undefined;
  readonly #scheduler: FlushScheduler | undefined;
  readonly #debug: boolean;
  readonly #deliveryAbort = new AbortController();
  #lifecycle: LifecycleState = "active";
  #capturedEvents = 0;
  #sentEvents = 0;
  #droppedEvents = 0;
  #retryAttempts = 0;
  #failedBatches = 0;
  #rateLimitedEvents = 0;
  #inFlightEvents = 0;
  #inFlightDropCounted = false;
  #activeFlush: Promise<FlushResult> | undefined;
  #shutdownPromise: Promise<ShutdownResult> | undefined;

  constructor(options: InflowAPMOptions) {
    const resolution = resolveConfiguration(options);
    this.#debug = resolution.debug;
    this.#configuration = resolution.configuration;
    this.#configurationIssue = resolution.issue;

    if (this.#configuration) {
      this.#buffer = new BoundedBuffer<BuiltEvent>(
        this.#configuration.maxBufferSize,
      );
      this.#transport = new TelemetryTransport(this.#configuration);
      this.#scheduler = this.#configuration.enabled
        ? new FlushScheduler(
            this.#configuration.flushIntervalMs,
            () => this.flush(),
          )
        : undefined;
    } else {
      this.#scheduler = undefined;
      this.#debugLog("configuration_rejected", {
        code: this.#configurationIssue?.code ?? "invalid_options",
      });
    }
  }

  get enabled(): boolean {
    return (
      this.#configuration?.enabled === true &&
      this.#lifecycle === "active"
    );
  }

  captureEvent(event: TelemetryInput): CaptureResult {
    if (!this.#configuration || !this.#buffer) {
      return {
        accepted: false,
        reason: "invalid_configuration",
        ...(this.#configurationIssue
          ? { code: this.#configurationIssue.code }
          : {}),
        bufferedEvents: 0,
      };
    }
    if (this.#lifecycle !== "active") {
      return {
        accepted: false,
        reason: "shutdown",
        bufferedEvents: this.#buffer.size,
      };
    }
    if (!this.#configuration.enabled) {
      return {
        accepted: false,
        reason: "disabled",
        bufferedEvents: this.#buffer.size,
      };
    }

    try {
      const built = buildTelemetryEvent(event, this.#configuration);
      if (!built.ok) {
        this.#debugLog("event_rejected", { code: built.issue.code });
        return {
          accepted: false,
          reason: "invalid_event",
          code: built.issue.code,
          bufferedEvents: this.#buffer.size,
        };
      }

      if (!this.#buffer.push(built.value)) {
        this.#droppedEvents += 1;
        this.#debugLog("event_dropped", { reason: "buffer_full" });
        return {
          accepted: false,
          reason: "buffer_full",
          bufferedEvents: this.#buffer.size,
        };
      }
      this.#capturedEvents += 1;
      if (this.#buffer.size >= this.#configuration.flushThreshold) {
        this.#scheduler?.request();
      }
      return { accepted: true, bufferedEvents: this.#buffer.size };
    } catch {
      this.#debugLog("event_rejected", { code: "invalid_event" });
      return {
        accepted: false,
        reason: "invalid_event",
        code: "invalid_event",
        bufferedEvents: this.#buffer.size,
      };
    }
  }

  express(options?: ExpressInstrumentationOptions): ExpressMiddleware {
    return createExpressMiddleware(
      () => this.enabled,
      (event) => {
        this.captureEvent(event);
      },
      options,
    );
  }

  flush(): Promise<FlushResult> {
    if (this.#lifecycle === "closed") {
      return Promise.resolve({
        ok: false,
        sentEvents: 0,
        droppedEvents: 0,
        pendingEvents: 0,
        batches: 0,
        failure: { kind: "lifecycle_closed" },
      });
    }
    if (this.#activeFlush) return this.#activeFlush;
    const flush = this.#performFlush().catch(() => ({
      ok: false,
      sentEvents: 0,
      droppedEvents: 0,
      pendingEvents: this.#buffer?.size ?? 0,
      batches: 0,
      failure: { kind: "internal_error" as const },
    }));
    this.#activeFlush = flush;
    void flush.then((result) => {
      if (this.#activeFlush === flush) this.#activeFlush = undefined;
      if (
        result.ok &&
        this.#lifecycle === "active" &&
        (this.#buffer?.size ?? 0) >=
          (this.#configuration?.flushThreshold ?? Number.POSITIVE_INFINITY)
      ) {
        this.#scheduler?.request();
      }
    });
    return flush;
  }

  shutdown(): Promise<ShutdownResult> {
    if (this.#shutdownPromise) return this.#shutdownPromise;
    const shutdown = this.#performShutdown().catch(() => ({
      ok: false,
      timedOut: false,
      sentEvents: 0,
      droppedEvents: 0,
      pendingEvents: this.#buffer?.size ?? 0,
      failure: { kind: "internal_error" as const },
    }));
    this.#shutdownPromise = shutdown;
    return shutdown;
  }

  getStats(): InflowAPMStats {
    return {
      enabled: this.enabled,
      capturedEvents: this.#capturedEvents,
      bufferedEvents: this.#buffer?.size ?? 0,
      sentEvents: this.#sentEvents,
      droppedEvents: this.#droppedEvents,
      retryAttempts: this.#retryAttempts,
      failedBatches: this.#failedBatches,
      rateLimitedEvents: this.#rateLimitedEvents,
      ...(this.#configurationIssue
        ? { configurationIssue: this.#configurationIssue }
        : {}),
    };
  }

  async #performFlush(): Promise<FlushResult> {
    if (
      !this.#configuration ||
      !this.#buffer ||
      !this.#transport
    ) {
      return {
        ok: false,
        sentEvents: 0,
        droppedEvents: 0,
        pendingEvents: 0,
        batches: 0,
        failure: { kind: "invalid_configuration" },
      };
    }
    if (!this.#configuration.enabled || this.#buffer.size === 0) {
      return {
        ok: true,
        sentEvents: 0,
        droppedEvents: 0,
        pendingEvents: this.#buffer.size,
        batches: 0,
      };
    }

    let remainingFromSnapshot = this.#buffer.size;
    let sentEvents = 0;
    let droppedEvents = 0;
    let batches = 0;

    while (remainingFromSnapshot > 0) {
      if (this.#lifecycle === "closed") break;
      const batch = this.#takeNextBatch(remainingFromSnapshot);
      if (batch.length === 0) break;
      remainingFromSnapshot -= batch.length;
      batches += 1;

      this.#inFlightEvents = batch.length;
      const delivery = await deliverWithRetry(
        this.#transport,
        batch,
        this.#configuration,
        this.#deliveryAbort.signal,
        (failure, delayMs) => {
          this.#debugLog("batch_retry_scheduled", {
            kind: failure.kind,
            delayMs,
          });
        },
      );
      this.#retryAttempts += delivery.retryAttempts;
      this.#rateLimitedEvents += delivery.rateLimitResponses * batch.length;
      const dropWasPrecounted = this.#inFlightDropCounted;
      this.#inFlightEvents = 0;
      this.#inFlightDropCounted = false;
      const outcome = dropWasPrecounted
        ? {
            ok: false as const,
            failure: { kind: "cancelled" as const },
          }
        : delivery.outcome;

      if (!outcome.ok) {
        droppedEvents += batch.length;
        if (!dropWasPrecounted) this.#droppedEvents += batch.length;
        this.#failedBatches += 1;
        this.#debugLog("batch_dropped", {
          events: batch.length,
          kind: outcome.failure.kind,
          ...(outcome.failure.statusCode === undefined
            ? {}
            : { statusCode: outcome.failure.statusCode }),
        });
        return {
          ok: false,
          sentEvents,
          droppedEvents,
          pendingEvents: this.#buffer.size,
          batches,
          failure: outcome.failure,
        };
      }

      sentEvents += batch.length;
      this.#sentEvents += batch.length;
    }

    return {
      ok: true,
      sentEvents,
      droppedEvents,
      pendingEvents: this.#buffer.size,
      batches,
    };
  }

  async #performShutdown(): Promise<ShutdownResult> {
    if (this.#lifecycle === "closed") {
      return {
        ok: true,
        timedOut: false,
        sentEvents: 0,
        droppedEvents: 0,
        pendingEvents: 0,
      };
    }

    this.#lifecycle = "shutting_down";
    this.#scheduler?.stop();
    if (!this.#configuration || !this.#buffer) {
      this.#lifecycle = "closed";
      return {
        ok: true,
        timedOut: false,
        sentEvents: 0,
        droppedEvents: 0,
        pendingEvents: 0,
      };
    }

    const flush = this.flush();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutReached = new Promise<"timeout">((resolve) => {
      timeout = setTimeout(
        () => resolve("timeout"),
        this.#configuration?.shutdownTimeoutMs ?? 1,
      );
      timeout.unref();
    });
    const outcome = await Promise.race([
      flush.then((result) => ({ kind: "flush" as const, result })),
      timeoutReached,
    ]);

    if (outcome === "timeout") {
      this.#deliveryAbort.abort();
      const bufferedDrops = this.#buffer.clear();
      let inFlightDrops = 0;
      if (this.#inFlightEvents > 0 && !this.#inFlightDropCounted) {
        inFlightDrops = this.#inFlightEvents;
        this.#inFlightDropCounted = true;
      }
      const droppedEvents = bufferedDrops + inFlightDrops;
      this.#droppedEvents += droppedEvents;
      this.#lifecycle = "closed";
      return {
        ok: false,
        timedOut: true,
        sentEvents: 0,
        droppedEvents,
        pendingEvents: 0,
        failure: { kind: "cancelled" },
      };
    }

    if (timeout) clearTimeout(timeout);
    const remainingDrops = this.#buffer.clear();
    this.#droppedEvents += remainingDrops;
    this.#lifecycle = "closed";
    return {
      ok: outcome.result.ok && remainingDrops === 0,
      timedOut: false,
      sentEvents: outcome.result.sentEvents,
      droppedEvents: outcome.result.droppedEvents + remainingDrops,
      pendingEvents: 0,
      ...(outcome.result.failure
        ? { failure: outcome.result.failure }
        : {}),
    };
  }

  #takeNextBatch(limit: number): TelemetryEvent[] {
    if (!this.#configuration || !this.#buffer) return [];
    const batch: TelemetryEvent[] = [];
    let serializedBytes = 2;
    const maximumEvents = Math.min(this.#configuration.batchSize, limit);

    while (batch.length < maximumEvents) {
      const candidate = this.#buffer.peek();
      if (!candidate) break;
      const additionalBytes =
        candidate.serializedBytes + (batch.length === 0 ? 0 : 1);
      if (
        batch.length > 0 &&
        serializedBytes + additionalBytes > MAX_REQUEST_BODY_BYTES
      ) {
        break;
      }
      const removed = this.#buffer.shift();
      if (!removed) break;
      batch.push(removed.event);
      serializedBytes += additionalBytes;
    }
    return batch;
  }

  #debugLog(event: string, details: Readonly<Record<string, unknown>>): void {
    if (!this.#debug) return;
    try {
      console.warn(`[InflowAPM] ${event}`, details);
    } catch {
      // Host console implementations are outside SDK control.
    }
  }
}
