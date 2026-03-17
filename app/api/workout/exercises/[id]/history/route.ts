import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// GET /api/workout/exercises/[id]/history
// Returns per-session max weight, max reps, and total volume for a given exercise
async function getHistory(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;

  const sessionExercises = await prisma.sessionExercise.findMany({
    where: {
      exerciseId: id,
      session: { userId: req.session.userId, completedAt: { not: null } },
    },
    include: {
      sets: true,
      session: { select: { startedAt: true } },
    },
    orderBy: { session: { startedAt: "asc" } },
  });

  type SessionExerciseWithSets = (typeof sessionExercises)[number];
  const history = sessionExercises.map((se: SessionExerciseWithSets) => {
    let maxWeight = 0;
    let maxReps = 0;
    let totalVolume = 0;
    for (const set of se.sets) {
      if (!set.completed) continue;
      const w = Number(set.weightKg ?? 0);
      const r = set.reps ?? 0;
      if (w > maxWeight) maxWeight = w;
      if (r > maxReps) maxReps = r;
      totalVolume += w * r;
    }
    return {
      date: se.session.startedAt.toISOString().slice(0, 10),
      maxWeight,
      maxReps,
      totalVolume: Math.round(totalVolume),
    };
  });

  // If multiple sessions on same day, keep the best
  const byDay: Record<string, typeof history[0]> = {};
  for (const h of history) {
    const existing = byDay[h.date];
    if (!existing || h.maxWeight > existing.maxWeight) {
      byDay[h.date] = h;
    }
  }

  return NextResponse.json(Object.values(byDay));
}

export const GET = withAuth(getHistory);
