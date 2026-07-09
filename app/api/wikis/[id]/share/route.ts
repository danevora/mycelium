import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { enableGraphShare, disableGraphShare } from "@/lib/db";

export const runtime = "nodejs";

/** Enable public graph sharing for a wiki the caller owns; returns the share token. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const token = await enableGraphShare(userId, id);
  if (!token) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
  return NextResponse.json({ token });
}

/** Disable public graph sharing (revoke the token), only if the caller owns the wiki. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await disableGraphShare(userId, id);
  if (!ok) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
