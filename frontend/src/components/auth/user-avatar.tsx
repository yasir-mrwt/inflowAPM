"use client";

import { createAvatar } from "@dicebear/core";
import * as identicon from "@dicebear/identicon";
import Image from "next/image";
import { useMemo, useState } from "react";

import type { AuthUser } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

export function avatarSeed(user: Pick<AuthUser, "id" | "email">): string {
  return user.id.trim() || user.email.trim().toLowerCase() || "inflowapm-user";
}

export function UserAvatar({ user, className }: { user: AuthUser; className?: string }) {
  const [failed, setFailed] = useState(false);
  const seed = avatarSeed(user);
  const source = useMemo(() => {
    try {
      return createAvatar(identicon, { seed, size: 64 }).toDataUri();
    } catch {
      return null;
    }
  }, [seed]);
  const initials = `${user.first_name.at(0) ?? ""}${user.last_name.at(0) ?? ""}`.toUpperCase() || "IA";

  return (
    <span className={cn("relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-brand-steel/25 bg-brand-muted font-mono text-xs font-semibold text-brand", className)} data-avatar-seed={seed}>
      {source && !failed ? <Image src={source} alt={`${user.first_name} ${user.last_name} avatar`} fill sizes="40px" unoptimized onError={() => setFailed(true)} /> : <span aria-label={`${user.first_name} ${user.last_name} initials`}>{initials}</span>}
    </span>
  );
}
