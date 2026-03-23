import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function patchGoal(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const goal = await prisma.goal.updateMany({
      where: { id, userId: req.session.userId },
      data: {
        completedAt: body.completedAt !== undefined ? (body.completedAt ? new Date(body.completedAt) : null) : undefined,
        name: body.name,
        targetValue: body.targetValue,
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
        notes: body.notes,
      },
    });
    return NextResponse.json(goal);
  } catch (e) {
    console.error("[goals/[id] PATCH] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function deleteGoal(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await prisma.goal.deleteMany({ where: { id, userId: req.session.userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[goals/[id] DELETE] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const PATCH = withAuth(patchGoal);
export const DELETE = withAuth(deleteGoal);
