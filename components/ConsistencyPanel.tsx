"use client";

import { useState } from "react";
import Link from "next/link";

type Finding = { entity: string; issue: string; locations: string[] };

export default function ConsistencyPanel({ wikiId }: { wikiId: string }) {
  const wikiBase = `/w/${wikiId}/wiki`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);

  async function run() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/consistency", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wikiId }),
      });
      const data = (await res.json()) as { findings?: Finding[]; error?: string };
      if (res.status === 429) {
        throw new Error(
          data.error ?? "You've hit today's consistency-check limit. Try again tomorrow.",
        );
      }
      if (!res.ok) throw new Error(data.error ?? "Consistency check failed");
      setFindings(data.findings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Consistency check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={busy}
          className="rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Checking…" : "Run check"}
        </button>
        {busy && (
          <span className="text-sm text-faint">Scanning your pages for contradictions…</span>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {findings !== null && findings.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-edge p-10 text-center">
          <p className="text-muted">No contradictions found — your wiki is consistent.</p>
        </div>
      )}

      {findings !== null && findings.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-faint">
            {findings.length} potential {findings.length === 1 ? "issue" : "issues"} found.
          </p>
          {findings.map((f, i) => (
            <div key={i} className="rounded-xl border border-edge bg-card/40 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-fg">{f.entity}</h3>
              </div>
              <p className="mt-1.5 text-sm text-muted">{f.issue}</p>
              {f.locations.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-edge pt-2.5">
                  <span className="text-xs text-faint">Where:</span>
                  {f.locations.map((loc) => (
                    <Link
                      key={loc}
                      href={`${wikiBase}/${loc}`}
                      className="rounded bg-lav-dim/20 px-1.5 py-0.5 text-xs text-lav-light hover:bg-lav-dim/40"
                    >
                      {loc}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
