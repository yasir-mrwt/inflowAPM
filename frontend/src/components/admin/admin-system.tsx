"use client";

import { Database, Mail, Network, Server, Workflow } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  StatusBadge,
  requestErrorMessage,
} from "@/components/admin/admin-ui";
import { adminHealthRequest, type AdminSystemHealth, type QueueHealth } from "@/lib/admin-api";

export function AdminSystemView() {
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminHealthRequest(controller.signal).then(setHealth).catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [revision]);

  return (
    <div>
      <AdminPageHeader eyebrow="Operations" title="System health" description="Safe runtime status for the API, data stores, delivery queues, and mail configuration." onRefresh={refresh} refreshing={!health && !error} />
      {error && !health ? <AdminError message={error} retry={refresh} /> : null}
      {!health && !error ? <AdminLoading label="Checking platform services…" /> : null}
      {health ? <>{error ? <AdminError message={error} retry={refresh} /> : null}<section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Service health"><HealthCard title="API" status={health.api} icon={Server} description="Express application runtime" /><HealthCard title="PostgreSQL" status={health.postgresql} icon={Database} description="Primary platform datastore" /><HealthCard title="Redis" status={health.redis} icon={Network} description="Caching, sessions, and queues" /><QueueCard title="Telemetry queue" queue={health.queues.telemetry} /><QueueCard title="Email queue" queue={health.queues.email} /><HealthCard title="Resend mail" status={!health.mail_enabled ? "DISABLED" : health.resend_configured ? "CONFIGURED" : "DOWN"} icon={Mail} description={health.mail_enabled ? "Transactional delivery configuration" : "Mail delivery is disabled"} /></section></> : null}
    </div>
  );
}

function HealthCard({ title, status, icon: Icon, description }: { title: string; status: string; icon: typeof Server; description: string }) {
  return <article className="rounded-md border border-border-subtle bg-surface p-5"><div className="flex items-center justify-between gap-3"><Icon size={17} className="text-brand-steel" aria-hidden="true" /><StatusBadge status={status} /></div><h2 className="mt-5 text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-text-muted">{description}</p></article>;
}

function QueueCard({ title, queue }: { title: string; queue: QueueHealth }) {
  return <article className="rounded-md border border-border-subtle bg-surface p-5"><div className="flex items-center justify-between gap-3"><Workflow size={17} className="text-brand-steel" aria-hidden="true" /><StatusBadge status={queue.status} /></div><h2 className="mt-5 text-sm font-semibold">{title}</h2>{queue.status === "DISABLED" ? <p className="mt-2 text-xs text-text-muted">Queue is disabled by platform configuration.</p> : <dl className="mt-4 grid grid-cols-3 gap-2 text-center"><QueueCount label="Waiting" value={queue.waiting ?? 0} /><QueueCount label="Active" value={queue.active ?? 0} /><QueueCount label="Failed" value={queue.failed ?? 0} /></dl>}</article>;
}

function QueueCount({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-border-subtle bg-surface-inset px-2 py-3"><dt className="font-mono text-[0.5625rem] uppercase text-text-muted">{label}</dt><dd className="mt-1.5 font-mono text-sm">{value.toLocaleString()}</dd></div>;
}
