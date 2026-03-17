import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function deleteEntry(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  await prisma.bodyEntry.deleteMany({
    where: { id, userId: req.session.userId },
  });
  return NextResponse.json({ ok: true });
}

export const DELETE = withAuth(deleteEntry);
