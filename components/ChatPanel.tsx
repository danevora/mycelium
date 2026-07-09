"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarkdownView from "@/components/MarkdownView";

type Msg = {
  role: "user" | "assistant";
  content: string;
  changedSlugs?: string[];
};

export default function ChatPanel({
  initial,
  existingSlugs,
  wikiId,
}: {
  initial: Msg[];
  existingSlugs: string[];
  wikiId: string;
}) {
  const wikiBase = `/w/${wikiId}/wiki`;
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, wikiId }),
      });
      const data = (await res.json()) as {
        reply?: string;
        changedSlugs?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "", changedSlugs: data.changedSlugs },
      ]);
      if ((data.changedSlugs?.length ?? 0) > 0) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col rounded-xl border border-edge bg-card/40">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-faint">
            Ask a question about your wiki (answers cite pages), or request an edit — e.g.
            “add that Lady Jessica is Paul’s mother”.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-lav-dim/30 text-fg"
                  : "bg-cardhi/60 text-fg"
              }`}
            >
              {m.role === "assistant" ? (
                <MarkdownView content={m.content} existingSlugs={existingSlugs} basePath={wikiBase} />
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
              {(m.changedSlugs?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-edge pt-2">
                  <span className="text-xs text-faint">Updated:</span>
                  {m.changedSlugs!.map((s) => (
                    <Link
                      key={s}
                      href={`${wikiBase}/${s}`}
                      className="rounded bg-lav-dim/20 px-1.5 py-0.5 text-xs text-lav-light hover:bg-lav-dim/40"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-faint">Thinking…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-edge p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask or edit…  (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 resize-none rounded-md border border-edge bg-sunken px-3 py-2 text-sm outline-none focus:border-lav-dim"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-md bg-lav px-4 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
