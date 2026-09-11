# SDK-4 request-path benchmark

This benchmark compares identical Express applications with and without `inflow.express()`. Each mode runs in a fresh Node process, performs a warmup, and uses the same native HTTP keep-alive load generator, route, request count, and concurrency. Sample order alternates to reduce order bias.

The measured window includes route timing, telemetry event construction, validation, and bounded buffer append. It intentionally keeps telemetry delivery outside that window by using a high threshold and long interval. The instrumented worker flushes to a local collector afterward and reports delivery separately.

Run the default three samples:

```bash
npm run benchmark
```

Override workload without changing the scripts:

```bash
SDK4_BENCH_SAMPLES=5 SDK4_BENCH_REQUESTS=10000 SDK4_BENCH_CONCURRENCY=50 npm run benchmark
```

Results are machine-local engineering measurements, not universal production claims. Background activity, CPU power state, thermal state, and the fact that client/server share one process can affect them.
