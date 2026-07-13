/**
 * Browser half of the NDJSON protocol in `lib/ndjson.ts`.
 *
 * Pre-stream failures (401/400/404/413/429) arrive as ordinary JSON with a real
 * status; failures after the stream opened arrive as an `error` event. Both are
 * raised as a thrown Error so callers keep a single catch path.
 */

type ErrorEvent = { type: "error"; error?: string };

export async function readNdjson<T extends { type: string }>(
  res: Response,
  onEvent: (event: T) => void,
): Promise<void> {
  const isStream = res.headers.get("content-type")?.includes("ndjson");
  if (!res.ok || !res.body || !isStream) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as T | ErrorEvent;
    if (event.type === "error") throw new Error((event as ErrorEvent).error ?? "Request failed");
    onEvent(event as T);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? ""; // a read can end mid-line; carry the remainder
    for (const line of lines) handle(line);
  }
  handle(buf);
}
