import type { ResolvedConfiguration } from "./config.js";
import { SDK_NAME, SDK_VERSION, type TelemetryBatch } from "./protocol.js";

export type TransportFailureKind =
  | "timeout"
  | "network_error"
  | "rate_limited"
  | "server_error"
  | "authentication_error"
  | "validation_error"
  | "client_error"
  | "unexpected_response"
  | "cancelled"
  | "internal_error";

export interface TransportFailure {
  readonly kind: TransportFailureKind;
  readonly statusCode?: number;
  readonly retryAfterMs?: number;
}

export type TransportResult =
  | { readonly ok: true; readonly statusCode: number }
  | { readonly ok: false; readonly failure: TransportFailure };

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, date - Date.now());
}

function classifyResponse(response: Response): TransportResult {
  if (response.status >= 200 && response.status <= 299) {
    return { ok: true, statusCode: response.status };
  }

  const statusCode = response.status;
  if (statusCode === 408) {
    return { ok: false, failure: { kind: "timeout", statusCode } };
  }
  if (statusCode === 429) {
    const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
    return {
      ok: false,
      failure: {
        kind: "rate_limited",
        statusCode,
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      },
    };
  }
  if (statusCode >= 500 && statusCode <= 599) {
    return { ok: false, failure: { kind: "server_error", statusCode } };
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      ok: false,
      failure: { kind: "authentication_error", statusCode },
    };
  }
  if (statusCode === 400 || statusCode === 413 || statusCode === 422) {
    return { ok: false, failure: { kind: "validation_error", statusCode } };
  }
  if (statusCode >= 400 && statusCode <= 499) {
    return { ok: false, failure: { kind: "client_error", statusCode } };
  }
  return {
    ok: false,
    failure: { kind: "unexpected_response", statusCode },
  };
}

export class TelemetryTransport {
  constructor(private readonly configuration: ResolvedConfiguration) {}

  async send(
    batch: TelemetryBatch,
    externalSignal?: AbortSignal,
  ): Promise<TransportResult> {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    if (externalSignal?.aborted) {
      controller.abort();
    } else {
      externalSignal?.addEventListener("abort", abortFromCaller, {
        once: true,
      });
    }
    const timeout = setTimeout(
      () => controller.abort(),
      this.configuration.requestTimeoutMs,
    );
    timeout.unref();

    try {
      const response = await fetch(this.configuration.ingestionUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.configuration.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
        },
        body: JSON.stringify(batch),
        signal: controller.signal,
      });
      const outcome = classifyResponse(response);
      try {
        await response.body?.cancel();
      } catch {
        // Response disposal is best-effort and must not escape into the host app.
      }
      return outcome;
    } catch {
      return {
        ok: false,
        failure: {
          kind: externalSignal?.aborted
            ? "cancelled"
            : controller.signal.aborted
              ? "timeout"
              : "network_error",
        },
      };
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    }
  }
}
