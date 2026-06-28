"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { slug: string; title: string; special: boolean };

export default function WikiSidebar({
  items,
  activeSlug,
}: {
  items: Item[];
  activeSlug: string;
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter((i) =>
    `${i.title} ${i.slug}`.toLowerCase().includes(q.toLowerCase()),
  );
  const special = filtered.filter((i) => i.special);
  const normal = filtered.filter((i) => !i.special);

  const row = (i: Item) => (
    <Link
      key={i.slug}
      href={`/wiki/${i.slug}`}
      className={`block truncate rounded px-2 py-1 text-sm transition ${
        i.slug === activeSlug
          ? "bg-lav-dim/20 text-lav-light"
          : "text-muted hover:bg-cardhi hover:text-fg"
      }`}
    >
      {i.title}
    </Link>
  );

  return (
    <aside className="w-56 shrink-0">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search pages…"
        className="mb-3 w-full rounded-md border border-edge bg-sunken px-2.5 py-1.5 text-sm outline-none focus:border-lav-dim"
      />
      <div className="space-y-0.5">{special.map(row)}</div>
      {special.length > 0 && normal.length > 0 && (
        <div className="my-2 border-t border-edge" />
      )}
      <div className="space-y-0.5">{normal.map(row)}</div>
      {filtered.length === 0 && (
        <p className="px-2 text-sm text-faint">No pages.</p>
      )}
    </aside>
  );
}
