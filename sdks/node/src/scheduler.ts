export class FlushScheduler {
  readonly #timer: ReturnType<typeof setInterval>;
  #queued = false;
  #stopped = false;

  constructor(
    intervalMs: number,
    private readonly task: () => Promise<unknown>,
  ) {
    this.#timer = setInterval(() => this.request(), intervalMs);
    this.#timer.unref();
  }

  request(): void {
    if (this.#stopped || this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.#stopped) return;
      void this.task().catch(() => {
        // The public client contains its own fail-open boundary. This final
        // guard prevents future task changes from creating rejections.
      });
    });
  }

  stop(): void {
    if (this.#stopped) return;
    this.#stopped = true;
    clearInterval(this.#timer);
  }
}
