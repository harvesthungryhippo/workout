import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function deleteEntry(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const entry = await prisma.sleepEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== req.session.userId)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  await prisma.sleepEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const DELETE = withAuth(deleteEntry);
