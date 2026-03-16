import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/stats — progress stats for the current user
async function getStats(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

  const [sessions, prevSessions, allSessions] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: req.session.userId, startedAt: { gte: since }, completedAt: { not: null } },
      include: {
        exercises: { include: { sets: true } },
      },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: req.session.userId,
        startedAt: { gte: prevSince, lt: since },
        completedAt: { not: null },
      },
      include: { exercises: { include: { sets: true } } },
    }),
    // All sessions for PR calculation
    prisma.workoutSession.findMany({
      where: { userId: req.session.userId, completedAt: { not: null } },
      include: { exercises: { include: { exercise: true, sets: true } } },
    }),
  ]);

  // Total volume per session
  const calcVolume = (s: typeof sessions) =>
    s.reduce((acc, session) => {
      const v = session.exercises.reduce((a, ex) => {
        return (
          a +
          ex.sets.reduce((s2, set) => {
            if (!set.completed || !set.reps || !set.weightKg) return s2;
            return s2 + set.reps * Number(set.weightKg);
          }, 0)
        );
      }, 0);
      return acc + v;
    }, 0);

  const totalVolume = calcVolume(sessions);
  const prevVolume = calcVolume(prevSessions);
  const volumeTrend = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume) * 100 : 0;

  // Sessions per week
  const sessionsPerWeek = sessions.length / (days / 7);
  const prevSessionsPerWeek = prevSessions.length / (days / 7);

  // PRs per exercise: max weight and max reps at any weight
  const prs: Record<string, { exerciseName: string; maxWeight: number; maxReps: number; maxVolume: number }> = {};

  for (const session of allSessions) {
    for (const ex of session.exercises) {
      const key = ex.exerciseId;
      if (!prs[key]) {
        prs[key] = {
          exerciseName: ex.exercise.name,
          maxWeight: 0,
          maxReps: 0,
          maxVolume: 0,
        };
      }
      for (const set of ex.sets) {
        if (!set.completed) continue;
        if (set.weightKg && Number(set.weightKg) > prs[key].maxWeight) {
          prs[key].maxWeight = Number(set.weightKg);
        }
        if (set.reps && set.reps > prs[key].maxReps) {
          prs[key].maxReps = set.reps;
        }
        const vol = (set.reps ?? 0) * Number(set.weightKg ?? 0);
        if (vol > prs[key].maxVolume) prs[key].maxVolume = vol;
      }
    }
  }

  // Recent session list (summary)
  const recentSessions = sessions.slice(0, 10).map((s) => ({
    id: s.id,
    name: s.name,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    durationSeconds: s.durationSeconds,
    exerciseCount: s.exercises.length,
    volume: s.exercises.reduce((a, ex) => {
      return (
        a +
        ex.sets.reduce((s2, set) => {
          if (!set.completed || !set.reps || !set.weightKg) return s2;
          return s2 + set.reps * Number(set.weightKg);
        }, 0)
      );
    }, 0),
  }));

  return NextResponse.json({
    period: { days, since, prevSince },
    sessionCount: sessions.length,
    prevSessionCount: prevSessions.length,
    sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
    prevSessionsPerWeek: Math.round(prevSessionsPerWeek * 10) / 10,
    totalVolume: Math.round(totalVolume),
    prevVolume: Math.round(prevVolume),
    volumeTrend: Math.round(volumeTrend),
    prs: Object.values(prs).sort((a, b) => b.maxVolume - a.maxVolume),
    recentSessions,
  });
}

export const GET = withAuth(getStats);
