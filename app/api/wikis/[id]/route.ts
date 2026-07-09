import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateWikiMeta, updateWikiSchema, softDeleteWiki } from "@/lib/db";

export const runtime = "nodejs";

/** Soft-delete a wiki the caller owns (moves it to trash; restorable). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const ok = await softDeleteWiki(userId, id);
    if (!ok) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete wiki";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Cap the organization-rules text — it's injected verbatim into the AI system
// prompt, so keep it bounded.
const MAX_SCHEMA = 8000;

/** Rename / re-describe a wiki the caller owns, or update its organization rules (schema). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      schema?: string;
    };

    // Schema-only update from the organization-rules editor.
    if (typeof body.schema === "string") {
      const wiki = await updateWikiSchema(userId, id, body.schema.slice(0, MAX_SCHEMA));
      if (!wiki) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
      return NextResponse.json({ id: wiki.id, schema: wiki.schema });
    }

    const name = body.name?.trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const description = body.description?.trim().slice(0, 200) ?? "";

    const wiki = await updateWikiMeta(userId, id, name, description);
    if (!wiki) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
    return NextResponse.json({ id: wiki.id, name: wiki.name, description: wiki.description });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update wiki";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
