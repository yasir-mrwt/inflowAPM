"use client";

import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useAdmin } from "@/components/admin/admin-provider";
import { AdminError, AdminLoading, AdminPageHeader, Notice, StatusBadge, requestErrorMessage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { adminSettingsRequest, changeAdminPasswordRequest, type AdminSettings } from "@/lib/admin-api";

export function AdminSettingsView() {
  const { endSession } = useAdmin();
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setError(""); setRevision((value) => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminSettingsRequest(controller.signal).then(setSettings).catch((reason) => { const message = requestErrorMessage(reason); if (message) setError(message); });
    return () => controller.abort();
  }, [revision]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("currentPassword") ?? "");
    const next = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");
    setFormError("");
    if (current.length < 5 || current.length > 100) { setFormError("Current password must be 5 to 100 characters."); return; }
    if (next.length < 8 || next.length > 100) { setFormError("New password must be 8 to 100 characters."); return; }
    if (next !== confirm) { setFormError("New password and confirmation must match."); return; }
    if (current === next) { setFormError("New password must be different from the current password."); return; }
    setSaving(true);
    try {
      await changeAdminPasswordRequest({ current_password: current, new_password: next });
      form.reset();
      endSession();
      router.replace("/admin/login?passwordChanged=1");
    } catch (reason) {
      form.reset();
      setFormError(requestErrorMessage(reason));
    } finally {
      setSaving(false);
      setVisible({});
    }
  }

  return (
    <div>
      <AdminPageHeader eyebrow="Configuration" title="Settings" description="Read-only platform configuration state and administrator credential controls." onRefresh={refresh} refreshing={!settings && !error} />
      {error && !settings ? <AdminError message={error} retry={refresh} /> : null}
      {!settings && !error ? <AdminLoading label="Loading platform settings…" /> : null}
      {settings ? <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]"><section className="rounded-md border border-border-subtle bg-surface" aria-labelledby="platform-settings-title"><div className="border-b border-border-subtle bg-surface-inset p-5"><h2 id="platform-settings-title" className="text-sm font-semibold">Platform state</h2><p className="mt-1 text-xs text-text-muted">Presence and enablement only. Secret values are never returned.</p></div><dl className="divide-y divide-border-subtle"><Setting label="Environment" status={settings.environment} /><Setting label="Mail delivery" status={settings.mail_enabled ? "enabled" : "disabled"} /><Setting label="Mail provider" status={settings.mail_provider_configured ? "configured" : "unavailable"} /><Setting label="Google OAuth" status={settings.google_oauth_configured ? "configured" : "unavailable"} /><Setting label="Telemetry queue" status={settings.telemetry_queue_available ? "operational" : "unavailable"} /></dl></section><section className="h-fit rounded-md border border-border-subtle bg-surface p-5" aria-labelledby="admin-password-title"><div className="flex items-center gap-2"><KeyRound size={16} className="text-brand-steel" aria-hidden="true" /><h2 id="admin-password-title" className="text-sm font-semibold">Change admin password</h2></div><p className="mt-2 text-xs leading-5 text-text-muted">Changing the password revokes the current refresh session. You will sign in again after success.</p><form onSubmit={changePassword} noValidate className="mt-5 space-y-4">{[["currentPassword", "Current password", 5], ["newPassword", "New password", 8], ["confirmPassword", "Confirm new password", 8]] .map(([name, label, minimum]) => <PasswordInput key={String(name)} name={String(name)} label={String(label)} minLength={Number(minimum)} visible={Boolean(visible[String(name)])} onToggle={() => setVisible((value) => ({ ...value, [String(name)]: !value[String(name)] }))} describedBy={formError ? "admin-password-error" : undefined} />)}{formError ? <Notice kind="error"><span id="admin-password-error">{formError}</span></Notice> : null}<Button type="submit" className="w-full" disabled={saving} aria-busy={saving}>{saving ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />}{saving ? "Updating…" : "Change password"}</Button></form></section></div> : null}
    </div>
  );
}

function Setting({ label, status }: { label: string; status: string }) {
  return <div className="flex items-center justify-between gap-4 px-5 py-4"><dt className="text-sm text-text-secondary">{label}</dt><dd><StatusBadge status={status} /></dd></div>;
}

function PasswordInput({ name, label, minLength, visible, onToggle, describedBy }: { name: string; label: string; minLength: number; visible: boolean; onToggle: () => void; describedBy?: string }) {
  return <div><label htmlFor={name} className="mb-2 block text-xs font-medium text-text-secondary">{label}</label><div className="relative"><input id={name} name={name} type={visible ? "text" : "password"} minLength={minLength} maxLength={100} required autoComplete={name === "currentPassword" ? "current-password" : "new-password"} aria-describedby={describedBy} className="h-10 w-full rounded-md border border-border bg-surface-inset px-3 pr-10 text-sm outline-none focus:border-brand-steel focus:ring-2 focus:ring-brand/15" /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-text-muted hover:text-text-primary" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible}>{visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></div></div>;
}
