import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getGoals(req: AuthedRequest) {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.session.userId },
      include: { exercise: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(goals);
  } catch (e) {
    console.error("[goals GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function createGoal(req: AuthedRequest) {
  try {
    const body = await req.json();
    const goal = await prisma.goal.create({
      data: {
        userId: req.session.userId,
        name: body.name,
        exerciseId: body.exerciseId ?? null,
        targetValue: body.targetValue,
        unit: body.unit,
        deadline: body.deadline ? new Date(body.deadline) : null,
        notes: body.notes ?? null,
      },
      include: { exercise: { select: { id: true, name: true } } },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (e) {
    console.error("[goals POST] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getGoals);
export const POST = withAuth(createGoal);
