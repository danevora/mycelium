"use client";

import { useState } from "react";

/**
 * Owner-only control to enable/disable a public share link for this wiki's graph.
 * Calls POST/DELETE /api/wikis/[id]/share (owner-scoped server-side). The public
 * URL is derived from the token the server returns.
 */
export default function ShareGraphButton({
  wikiId,
  initialToken,
}: {
  wikiId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}/graph`
    : null;

  async function enable() {
    setBusy(true);
    try {
      const res = await fetch(`/api/wikis/${wikiId}/share`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (res.ok && data.token) setToken(data.token);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const res = await fetch(`/api/wikis/${wikiId}/share`, { method: "DELETE" });
      if (res.ok) setToken(null);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  if (!token) {
    return (
      <button
        onClick={enable}
        disabled={busy}
        className="rounded-md border border-edge px-3 py-1.5 text-sm text-muted hover:bg-cardhi hover:text-lav-light disabled:opacity-50"
      >
        {busy ? "…" : "Share graph"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={shareUrl ?? ""}
        onFocus={(e) => e.currentTarget.select()}
        className="w-56 rounded-md border border-edge bg-sunken px-2 py-1.5 text-xs text-muted"
      />
      <button
        onClick={copy}
        className="rounded-md border border-edge px-2.5 py-1.5 text-xs text-muted hover:bg-cardhi hover:text-lav-light"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        onClick={disable}
        disabled={busy}
        className="rounded-md border border-edge px-2.5 py-1.5 text-xs text-faint hover:text-fg disabled:opacity-50"
      >
        {busy ? "…" : "Stop"}
      </button>
    </div>
  );
}
