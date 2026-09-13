"use client";

import { Check, Copy, FolderKanban, LoaderCircle, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useProjects } from "@/components/projects/projects-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectsView() {
  const { projects, selectedProject, status, error, newCredential, selectProject, createProject, dismissCredential, reload } = useProjects();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);

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
      setCopied(false);
      form.reset();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The project could not be created.");
    } finally {
      setCreating(false);
    }
  }

  async function copyApiKey() {
    if (!newCredential) return;
    try {
      await navigator.clipboard.writeText(newCredential.apiKey);
      setCopied(true);
    } catch {
      setFormError("Copying was blocked. Select the API key and copy it manually.");
    }
  }

  return (
    <div>
      <p className="type-meta text-brand-steel">Project registry</p>
      <h1 className="type-page mt-3">Projects</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Create and select the real application workspace that scopes your telemetry and analytics.</p>

      {newCredential ? (
        <section className="mt-7 border border-warning/35 bg-warning-muted/35 p-4 sm:p-5" aria-labelledby="api-key-title">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="api-key-title" className="text-sm font-semibold text-text-primary">Save the API key for {newCredential.projectName}</h2>
              <p className="mt-1 text-xs leading-5 text-text-secondary">This raw key is returned only when the project is created. Store it securely before dismissing this message.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs text-brand">{newCredential.apiKey}</code>
                <Button type="button" variant="secondary" onClick={copyApiKey}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? "Copied" : "Copy"}</Button>
                <Button type="button" variant="ghost" onClick={dismissCredential} aria-label="Dismiss API key"><X size={16} aria-hidden="true" /></Button>
              </div>
            </div>
          </div>
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
