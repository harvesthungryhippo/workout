import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/overload?exerciseId=xxx
// Returns the last 3 sessions for an exercise and recommends next weight/reps
async function getSuggestion(req: AuthedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exerciseId = searchParams.get("exerciseId");
    if (!exerciseId) return NextResponse.json({ error: "exerciseId required." }, { status: 400 });

    // Get the last 5 sessions for this exercise
    const recentSessions = await prisma.sessionExercise.findMany({
      where: {
        exerciseId,
        session: { userId: req.session.userId, completedAt: { not: null } },
      },
      orderBy: { session: { startedAt: "desc" } },
      take: 5,
      include: {
        sets: { where: { completed: true }, orderBy: { setNumber: "asc" } },
        session: { select: { startedAt: true } },
      },
    });

    if (recentSessions.length === 0) {
      return NextResponse.json({ suggestion: null, history: [] });
    }

    // Build history
    const history = recentSessions.map((se) => {
      const completedSets = se.sets.filter((s) => s.completed && s.reps && s.weightKg);
      // weightKg column stores lb values (column is misnamed — UI inputs and stores lb throughout)
      const avgWeight = completedSets.length > 0
        ? completedSets.reduce((sum, s) => sum + parseFloat(s.weightKg!.toString()), 0) / completedSets.length
        : 0;
      const maxReps = completedSets.reduce((max, s) => Math.max(max, s.reps ?? 0), 0);
      const maxWeight = completedSets.reduce((max, s) => Math.max(max, parseFloat((s.weightKg ?? 0).toString())), 0);
      return {
        date: se.session.startedAt,
        setCount: completedSets.length,
        maxWeightLb: Math.round(maxWeight * 10) / 10,
        maxReps,
        avgWeightLb: Math.round(avgWeight * 10) / 10,
      };
    });

    const last = history[0];
    const prev = history[1];

    // Progressive overload logic:
    // If last session max reps >= 12 (top of typical range), suggest +5lb
    // If last session max reps < 8 (bottom), suggest same weight, aim for more reps
    // Otherwise, suggest same weight with +1-2 reps target
    let suggestion: { weightLb: number; reps: string; note: string } | null = null;

    if (last.maxWeightLb > 0) {
      if (last.maxReps >= 12) {
        const nextWeight = last.maxWeightLb + 5;
        suggestion = {
          weightLb: nextWeight,
          reps: "8-10",
          note: `You hit ${last.maxReps} reps at ${last.maxWeightLb} lb — time to increase weight!`,
        };
      } else if (last.maxReps >= 8) {
        const moreReps = Math.min(last.maxReps + 1, 12);
        suggestion = {
          weightLb: last.maxWeightLb,
          reps: `${moreReps}`,
          note: `Same weight as last time (${last.maxWeightLb} lb), aim for ${moreReps} reps.`,
        };
      } else {
        suggestion = {
          weightLb: last.maxWeightLb,
          reps: `${last.maxReps}`,
          note: `Keep working at ${last.maxWeightLb} lb until you can hit 12 reps consistently.`,
        };
      }

      // If they've stagnated for 2+ sessions, suggest a deload
      if (prev && last.maxWeightLb === prev.maxWeightLb && last.maxReps <= prev.maxReps) {
        suggestion.note += " (Consider a deload or technique check — no progress from last session.)";
      }
    }

    return NextResponse.json({ suggestion, history });
  } catch (e) {
    console.error("[overload GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getSuggestion);
