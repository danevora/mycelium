"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type WikiOption = { id: string; name: string };

export default function WikiSwitcher({
  wikis,
  currentId,
}: {
  wikis: WikiOption[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = wikis.find((w) => w.id === currentId);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[14rem] items-center gap-1.5 rounded-md border border-edge bg-card/60 px-2.5 py-1.5 text-sm text-fg hover:bg-cardhi"
      >
        <span className="truncate">{current?.name ?? "Wiki"}</span>
        <span className="text-faint">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-edge bg-card shadow-lg">
          <div className="max-h-72 overflow-y-auto py-1">
            {wikis.map((w) => (
              <Link
                key={w.id}
                href={`/w/${w.id}`}
                onClick={() => setOpen(false)}
                className={`block truncate px-3 py-1.5 text-sm transition ${
                  w.id === currentId
                    ? "bg-lav-dim/20 text-lav-light"
                    : "text-muted hover:bg-cardhi hover:text-fg"
                }`}
              >
                {w.name}
              </Link>
            ))}
          </div>
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block border-t border-edge px-3 py-2 text-sm text-lav hover:bg-cardhi hover:text-lav-light"
          >
            Manage wikis →
          </Link>
        </div>
      )}
    </div>
  );
}
