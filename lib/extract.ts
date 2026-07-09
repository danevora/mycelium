/**
 * Plain-text extraction from uploaded files for ingest.
 *
 * - `.txt` / `.md` are decoded directly as UTF-8.
 * - `.docx` is parsed via `mammoth.extractRawText`.
 * Anything else is rejected with a clear, user-facing error.
 *
 * Chunking of very long documents is intentionally NOT handled here (see T4).
 */
import mammoth from "mammoth";

export const SUPPORTED_UPLOAD_EXTENSIONS = [".txt", ".md", ".docx"] as const;

/** Max raw upload size (bytes) accepted before extraction. Guards against huge
 * uploads independent of the extracted-char cap (docx can compress heavily). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export type ExtractedFile = { title: string; text: string };

function extName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? filename : filename.slice(0, dot);
}

/**
 * Extract plain text from an uploaded file's bytes. Returns a derived title
 * (the filename without extension) and the extracted text.
 * Throws with a user-facing message on unsupported type or parse failure.
 */
export async function extractTextFromUpload(
  filename: string,
  bytes: Buffer,
): Promise<ExtractedFile> {
  const ext = extName(filename);
  const title = stripExt(filename).trim() || filename;

  if (ext === ".txt" || ext === ".md") {
    return { title, text: bytes.toString("utf-8") };
  }

  if (ext === ".docx") {
    try {
      const { value } = await mammoth.extractRawText({ buffer: bytes });
      return { title, text: value };
    } catch {
      throw new Error("Could not read .docx file — it may be corrupted.");
    }
  }

  throw new Error(
    `Unsupported file type "${ext || filename}". Upload a .txt, .md, or .docx file.`,
  );
}
