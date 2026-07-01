import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateWikiMeta } from "@/lib/db";

export const runtime = "nodejs";

/** Rename / re-describe a wiki the caller owns. */
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
    };
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
