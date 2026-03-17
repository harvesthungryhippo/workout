import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/stats — progress stats for the current user
async function getStats(req: AuthedRequest) {
  try {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

  const [sessions, prevSessions, allSessions] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: req.session.userId, startedAt: { gte: since }, completedAt: { not: null } },
      include: {
        exercises: { include: { exercise: { select: { muscleGroup: true } }, sets: true } },
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
      orderBy: { startedAt: "asc" },
    }),
  ]);

  type SessionLike = { exercises: { sets: { completed: boolean; reps: number | null; weightKg: { toString(): string } | null }[] }[] };
  // Total volume per session
  const calcVolume = (s: SessionLike[]) =>
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
  const prs: Record<string, { exerciseName: string; exerciseId: string; maxWeight: number; maxReps: number; maxVolume: number }> = {};

  for (const session of allSessions) {
    for (const ex of session.exercises) {
      const key = ex.exerciseId;
      if (!prs[key]) {
        prs[key] = {
          exerciseName: ex.exercise.name,
          exerciseId: ex.exerciseId,
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

  // Day map for heatmap — last 365 days
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const yearSessions = allSessions.filter((s) => s.startedAt >= yearAgo);

  const dayMap: Record<string, { count: number; volume: number }> = {};
  for (const s of yearSessions) {
    const day = s.startedAt.toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { count: 0, volume: 0 };
    dayMap[day].count += 1;
    dayMap[day].volume += s.exercises.reduce((a, ex) =>
      a + ex.sets.reduce((s2, set) => {
        if (!set.completed || !set.reps || !set.weightKg) return s2;
        return s2 + set.reps * Number(set.weightKg);
      }, 0), 0);
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

  // Streak calculation (consecutive days with a completed workout)
  const workoutDays = new Set(allSessions.map((s) => s.startedAt.toISOString().slice(0, 10)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  const cursor = new Date(today);
  // Allow today or yesterday to count (don't break streak if you haven't worked out yet today)
  if (!workoutDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (workoutDays.has(cursor.toISOString().slice(0, 10))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longestStreak = 0;
  let streak = 0;
  const sortedDays = Array.from(workoutDays).sort();
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      streak = diff === 1 ? streak + 1 : 1;
    }
    if (streak > longestStreak) longestStreak = streak;
  }

  // Volume by muscle group for the current period
  const muscleGroupVolume: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const mg = ex.exercise.muscleGroup as string;
      const vol = ex.sets.reduce((a, set) => {
        if (!set.completed || !set.reps || !set.weightKg) return a;
        return a + set.reps * Number(set.weightKg);
      }, 0);
      muscleGroupVolume[mg] = (muscleGroupVolume[mg] ?? 0) + vol;
    }
  }

  // Weekly sessions: this week vs last week
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);

  const thisWeekSessions = allSessions.filter((s) => s.startedAt >= weekStart).length;
  const lastWeekSessions = allSessions.filter(
    (s) => s.startedAt >= lastWeekStart && s.startedAt < weekStart
  ).length;

  const thisWeekVolume = calcVolume(allSessions.filter((s) => s.startedAt >= weekStart));
  const lastWeekVolume = calcVolume(allSessions.filter((s) => s.startedAt >= lastWeekStart && s.startedAt < weekStart));

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
      dayMap,
      currentStreak,
      longestStreak,
      muscleGroupVolume,
      weekly: {
        thisSessions: thisWeekSessions,
        lastSessions: lastWeekSessions,
        thisVolume: Math.round(thisWeekVolume),
        lastVolume: Math.round(lastWeekVolume),
      },
    });
  } catch (e) {
    console.error("stats error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getStats);
