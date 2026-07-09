/**
 * Input-safety helpers for the public trial.
 *
 * - Size caps bound how much user text we forward to the (paid) model.
 * - assertFetchableUrl is a best-effort SSRF guard for URL ingest: only public
 *   http(s) hosts. (Note: a determined attacker could still DNS-rebind between
 *   this check and the fetch — acceptable for a prototype; revisit if the trial
 *   opens widely.)
 */
import { lookup } from "node:dns/promises";
import net from "node:net";

export const MAX_SOURCE_CHARS = 100_000;
export const MAX_MESSAGE_CHARS = 8_000;

// Long-document (chunked) ingest bounds.
// Content up to MAX_SOURCE_CHARS goes through the single-shot ingest path.
// Beyond that we split into sequential chunks of at most CHUNK_CHARS each.
export const CHUNK_CHARS = 40_000;
// Hard upper bound on a single document, to bound total (paid) AI cost.
// ~2M chars ≈ 300k words; at CHUNK_CHARS that's ~50 chunks.
export const MAX_DOCUMENT_CHARS = 2_000_000;
export const MAX_CHUNKS = 60;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

export async function assertFetchableUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = url.hostname;
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0) throw new Error("Host did not resolve");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error("Refusing to fetch a private/internal address");
    }
  }
}
