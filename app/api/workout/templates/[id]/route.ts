import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function deleteTemplate(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  await prisma.workoutTemplate.deleteMany({
    where: { id, userId: req.session.userId },
  });
  return NextResponse.json({ ok: true });
}

export const DELETE = withAuth(deleteTemplate);
