/**
 * Newline-delimited JSON streaming for the AI routes.
 *
 * The AI calls take tens of seconds, so the routes stream progress instead of
 * buffering. Guards (auth, quota, size) still run *before* the stream opens and
 * return ordinary JSON with real status codes — once a byte is written the status
 * is committed, so anything that fails mid-stream arrives as an `error` event.
 */

export type NdjsonSend = (event: unknown) => void;

export function ndjsonResponse(produce: (send: NdjsonSend) => Promise<void>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send: NdjsonSend = (event) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false; // client hung up mid-stream
        }
      };
      try {
        await produce(send);
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "Request failed" });
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // already closed by a client disconnect
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no", // don't let a proxy buffer the whole body
    },
  });
}
