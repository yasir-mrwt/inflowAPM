"use client";

import { Check, CircleCheck, Copy, FolderKanban, LoaderCircle, Plus, RadioTower, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectsView() {
  const { projects, selectedProject, status, error, newCredential, selectProject, createProject, dismissCredential, reload } = useProjects();
  const { analytics, status: analyticsStatus, reload: reloadAnalytics } = useAnalytics();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [copiedState, setCopiedState] = useState<{ target: "key" | "install" | "snippet"; scope: string } | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCredential = newCredential?.projectId === selectedProject?.id ? newCredential : null;
  const credentialScope = activeCredential ? `${activeCredential.projectId}:${activeCredential.apiKey}` : "no-active-credential";

  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  function isCopied(target: "key" | "install" | "snippet"): boolean {
    return copiedState?.target === target && copiedState.scope === credentialScope;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    setFormError("");
    if (name.length < 3 || name.length > 100) {
      setFormError("Project name must be 3 to 100 characters.");
      return;
    }
    setCreating(true);
    try {
      await createProject(name);
      setCopiedState(null);
      form.reset();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The project could not be created.");
    } finally {
      setCreating(false);
    }
  }

  async function copyText(value: string, target: "key" | "install" | "snippet") {
    try {
      await navigator.clipboard.writeText(value);
      setFormError("");
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      setCopiedState({ target, scope: credentialScope });
      copyResetTimer.current = setTimeout(() => {
        setCopiedState(null);
        copyResetTimer.current = null;
      }, 1_800);
    } catch {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
        copyResetTimer.current = null;
      }
      setCopiedState(null);
      setFormError("Copying was blocked. Select the text and copy it manually.");
    }
  }

  const installCommand = "npm install @inflowapm/node";
  const serviceName = activeCredential?.projectName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-service";
  const integrationSnippet = activeCredential ? `import { InflowAPM } from "@inflowapm/node";

const inflow = new InflowAPM({
  apiKey: "${activeCredential.apiKey}",
  endpoint: "http://localhost:5002",
  service: "${serviceName}",
  environment: "development",
});

app.use(inflow.express());` : "";
  const requestCount = analytics?.overview.total_requests ?? 0;
  const connected = analyticsStatus === "ready" && requestCount > 0;

  return (
    <div>
      <p className="type-meta text-brand-steel">Project registry</p>
      <h1 className="type-page mt-3">Projects</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Create and select the real application workspace that scopes your telemetry and analytics.</p>

      {activeCredential ? (
        <section className="mt-7 border border-warning/35 bg-warning-muted/25" aria-labelledby="api-key-title">
          <div className="flex items-start gap-3 border-b border-warning/20 p-4 sm:p-5">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1"><h2 id="api-key-title" className="text-sm font-semibold text-text-primary">Connect {activeCredential.projectName}</h2><p className="mt-1 text-xs leading-5 text-text-secondary">The raw API key appears only now. Store it as a server-side secret before dismissing this guide.</p></div>
            <Button type="button" variant="ghost" size="icon" className="-mt-2 -mr-2 size-9" onClick={dismissCredential} aria-label="Dismiss API key and setup guide"><X size={16} aria-hidden="true" /></Button>
          </div>
          <ol className="divide-y divide-warning/15">
            <li className="grid gap-3 p-4 sm:grid-cols-[1.5rem_minmax(0,1fr)] sm:p-5"><span className="grid size-6 place-items-center rounded-full border border-warning/35 font-mono text-[0.625rem] text-warning">1</span><div className="min-w-0"><p className="text-xs font-semibold text-text-primary">Save the project API key</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs text-brand">{activeCredential.apiKey}</code><Button type="button" variant="secondary" size="sm" onClick={() => void copyText(activeCredential.apiKey, "key")}>{isCopied("key") ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span aria-live="polite">{isCopied("key") ? "Copied" : "Copy key"}</span></Button></div></div></li>
            <li className="grid gap-3 p-4 sm:grid-cols-[1.5rem_minmax(0,1fr)] sm:p-5"><span className="grid size-6 place-items-center rounded-full border border-warning/35 font-mono text-[0.625rem] text-warning">2</span><div className="min-w-0"><p className="text-xs font-semibold text-text-primary">Install the Node.js SDK</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs text-text-secondary">{installCommand}</code><Button type="button" variant="secondary" size="sm" onClick={() => void copyText(installCommand, "install")}>{isCopied("install") ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span aria-live="polite">{isCopied("install") ? "Copied" : "Copy"}</span></Button></div></div></li>
            <li className="grid gap-3 p-4 sm:grid-cols-[1.5rem_minmax(0,1fr)] sm:p-5"><span className="grid size-6 place-items-center rounded-full border border-warning/35 font-mono text-[0.625rem] text-warning">3</span><div className="min-w-0"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-text-primary">Add Express instrumentation</p><Button type="button" variant="ghost" size="sm" onClick={() => void copyText(integrationSnippet, "snippet")}>{isCopied("snippet") ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span aria-live="polite">{isCopied("snippet") ? "Copied" : "Copy snippet"}</span></Button></div><pre className="mt-3 max-w-full overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-[0.6875rem] leading-5 text-text-secondary"><code>{integrationSnippet}</code></pre></div></li>
          </ol>
        </section>
      ) : null}

      {selectedProject ? (
        <section className="mt-5 flex flex-col gap-3 border border-border-subtle bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Telemetry connection status" aria-live="polite">
          <div className="flex min-w-0 items-center gap-3">
            {analyticsStatus === "loading" || analyticsStatus === "idle" ? <LoaderCircle size={16} className="shrink-0 animate-spin text-brand-steel motion-reduce:animate-none" aria-hidden="true" /> : connected ? <CircleCheck size={16} className="shrink-0 text-success" aria-hidden="true" /> : <RadioTower size={16} className="shrink-0 text-warning" aria-hidden="true" />}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary">{analyticsStatus === "loading" || analyticsStatus === "idle" ? "Checking telemetry connection" : connected ? "Connected · First telemetry received" : analyticsStatus === "error" ? "Connection status unavailable" : "Waiting for telemetry"}</p>
              <p className="mt-0.5 truncate text-[0.6875rem] text-text-muted">{connected ? `${requestCount.toLocaleString()} real HTTP ${requestCount === 1 ? "request" : "requests"} received in the selected range.` : analyticsStatus === "error" ? "The analytics response could not be loaded. Try again." : `Send a request through ${selectedProject.name} after installing the SDK.`}</p>
            </div>
          </div>
          {!connected && analyticsStatus !== "loading" ? <Button type="button" variant="ghost" size="sm" onClick={reloadAnalytics}><RefreshCw size={14} aria-hidden="true" />Check again</Button> : null}
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0" aria-labelledby="project-list-title">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h2 id="project-list-title" className="text-sm font-semibold">Your projects</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => void reload()} disabled={status === "loading"}><RefreshCw size={14} className={status === "loading" ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />Refresh</Button>
          </div>

          {status === "loading" ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-text-muted" aria-live="polite"><LoaderCircle size={17} className="animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />Loading projects…</div> : null}
          {status === "error" ? <div role="alert" className="mt-5 border border-danger/25 bg-danger-muted/35 p-4 text-sm text-danger">{error}</div> : null}
          {status === "ready" && projects.length === 0 ? <div className="mt-5 border-y border-border-subtle bg-surface-inset px-5 py-10 text-center"><FolderKanban size={22} className="mx-auto text-text-muted" aria-hidden="true" /><h3 className="mt-4 text-sm font-semibold">No projects yet</h3><p className="mt-2 text-xs leading-5 text-text-muted">Create your first project to receive an ingest API key and begin monitoring.</p></div> : null}
          {status === "ready" && projects.length > 0 ? (
            <ul className="divide-y divide-border-subtle border-b border-border-subtle">
              {projects.map((project) => {
                const selected = project.id === selectedProject?.id;
                return <li key={project.id}><button type="button" onClick={() => selectProject(project.id)} aria-pressed={selected} className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-l-2 px-4 py-4 text-left transition-colors", selected ? "border-brand bg-brand-muted/45" : "border-transparent hover:bg-surface-hover")}><span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{project.name}</span><span className="mt-1 block truncate font-mono text-[0.625rem] text-text-muted">{project.id}</span></span><span className={cn("font-mono text-[0.625rem] uppercase", selected ? "text-brand" : "text-text-muted")}>{selected ? "Active" : "Select"}</span></button></li>;
              })}
            </ul>
          ) : null}
        </section>

        <section className="h-fit border border-border-subtle bg-surface-inset p-5" aria-labelledby="create-project-title">
          <div className="flex items-center gap-2"><Plus size={16} className="text-brand-steel" aria-hidden="true" /><h2 id="create-project-title" className="text-sm font-semibold">Create project</h2></div>
          <p className="mt-2 text-xs leading-5 text-text-muted">Use a recognizable application or service name.</p>
          <form className="mt-5" onSubmit={handleCreate} noValidate>
            <label htmlFor="project-name" className="mb-2 block text-xs font-medium text-text-secondary">Project name</label>
            <input id="project-name" name="name" required minLength={3} maxLength={100} autoComplete="off" aria-invalid={Boolean(formError)} aria-describedby={formError ? "project-name-error" : undefined} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none placeholder:text-text-muted focus:border-brand-steel focus:ring-2 focus:ring-brand/15" placeholder="Payments API" />
            {formError ? <p id="project-name-error" role="alert" className="mt-2 text-xs leading-5 text-danger">{formError}</p> : null}
            <Button type="submit" className="mt-4 w-full" disabled={creating} aria-busy={creating}>{creating ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{creating ? "Creating…" : "Create project"}</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
