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

async function renameTemplate(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 });
  const updated = await prisma.workoutTemplate.updateMany({
    where: { id, userId: req.session.userId },
    data: { name: name.trim() },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const DELETE = withAuth(deleteTemplate);
export const PATCH = withAuth(renameTemplate);
