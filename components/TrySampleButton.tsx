"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WIKI_SAMPLES, type WikiSample } from "@/lib/samples";

/**
 * One-click onboarding. For a chosen sample it POSTs /api/samples with the
 * sample's templateKey; the server creates the wiki and seeds its pre-authored
 * pages directly (no AI — samples are deterministic demo content), then we
 * router.push(`/w/{id}/graph`) to land on the populated graph. Surfaces the
 * per-tier cap (403 upgrade) gracefully.
 */
export default function TrySampleButton() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null); // templateKey being run
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  async function run(sample: WikiSample) {
    if (busy) return;
    setBusy(sample.templateKey);
    setError(null);
    setUpgrade(false);
    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateKey: sample.templateKey }),
      });
      const data = (await res.json()) as {
        id?: string;
        error?: string;
        upgrade?: boolean;
      };
      if (!res.ok || !data.id) {
        setUpgrade(Boolean(data.upgrade));
        throw new Error(data.error ?? "Could not create the sample wiki.");
      }
      // Land on the populated graph.
      router.push(`/w/${data.id}/graph`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
    // On success we navigate away, so leave `busy` set to keep the UI locked.
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {WIKI_SAMPLES.map((s) => (
          <button
            key={s.templateKey}
            type="button"
            disabled={busy !== null}
            onClick={() => run(s)}
            className="rounded-lg border border-edge bg-card p-4 text-left transition hover:border-lav-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block font-medium text-fg">{s.wikiName}</span>
            <span className="mt-1 block text-xs text-muted">
              {busy === s.templateKey
                ? "Building your wiki…"
                : `Sample ${s.templateKey.replace("-", " ")} wiki`}
            </span>
          </button>
        ))}
      </div>
      {busy && (
        <p className="text-sm text-muted">Creating your sample wiki…</p>
      )}
      {error && (
        <p className="text-sm text-red-400">
          {error}
          {upgrade && (
            <>
              {" "}
              <a
                href="/billing"
                className="font-medium text-lav hover:text-lav-light"
              >
                Upgrade →
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
