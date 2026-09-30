export function AuthFormSkeleton({ mode }: { mode: "login" | "reset-password" }) {
  return (
    <div className="animate-pulse" role="status" aria-busy="true" aria-label={`Loading ${mode === "login" ? "sign in" : "password reset"} form`}>
      <span className="block h-3 w-28 rounded-sm bg-surface-elevated" />
      <span className="mt-4 block h-8 w-56 max-w-full rounded-md bg-surface-elevated" />
      <span className="mt-3 block h-4 w-full max-w-sm rounded-sm bg-surface-elevated/80" />
      <span className="sr-only">Loading form…</span>
      <div className="mt-7 space-y-5" aria-hidden="true">
        {mode === "login" ? <><div className="grid gap-3 sm:grid-cols-2"><span className="block h-11 rounded-md border border-border-subtle bg-surface-inset" /><span className="block h-11 rounded-md border border-border-subtle bg-surface-inset" /></div><div className="flex items-center gap-3"><span className="h-px flex-1 bg-border-subtle" /><span className="h-3 w-12 rounded-sm bg-surface-elevated/75" /><span className="h-px flex-1 bg-border-subtle" /></div></> : null}
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index}>
            <span className="mb-2 block h-4 w-28 rounded-sm bg-surface-elevated/75" />
            <span className="block h-11 w-full rounded-md border border-border-subtle bg-surface-inset" />
          </div>
        ))}
        {mode === "login" ? <span className="ml-auto block h-3 w-24 rounded-sm bg-surface-elevated/75" /> : null}
        <span className="block h-11 w-full rounded-md bg-surface-elevated" />
      </div>
    </div>
  );
}
