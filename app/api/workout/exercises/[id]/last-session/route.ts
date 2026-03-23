import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// GET /api/workout/exercises/[id]/last-session
// Returns the individual sets from the most recent completed session for this exercise
async function getLastSession(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const KG_TO_LB = 2.20462;

    const se = await prisma.sessionExercise.findFirst({
      where: {
        exerciseId: id,
        session: { userId: req.session.userId, completedAt: { not: null } },
      },
      include: {
        sets: { orderBy: { setNumber: "asc" } },
        session: { select: { startedAt: true } },
      },
      orderBy: { session: { startedAt: "desc" } },
    });

    if (!se) return NextResponse.json(null);

    return NextResponse.json({
      date: se.session.startedAt.toISOString().slice(0, 10),
      notes: se.notes,
      sets: se.sets
        .filter((s) => s.completed)
        .map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weightLb: s.weightKg ? Math.round(Number(s.weightKg) * KG_TO_LB * 10) / 10 : null,
          durationSeconds: s.durationSeconds,
        })),
    });
  } catch (e) {
    console.error("[exercises/[id]/last-session GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getLastSession);
