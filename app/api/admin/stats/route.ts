import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin, type AuthedRequest } from "@/lib/api/withAdmin";
import type { Params } from "@/lib/api/withAuth";

async function getAdminStats(_req: AuthedRequest, _ctx: Params) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers30d,
    activeUsers7d,
    totalSessions,
    totalSets,
    feedbackCounts,
    topExercises,
    sessionsPerDay,
    newUsersPerDay,
  ] = await Promise.all([
    prisma.workoutUser.count(),

    prisma.workoutSession.groupBy({
      by: ["userId"],
      where: { startedAt: { gte: thirtyDaysAgo } },
    }).then((r) => r.length),

    prisma.workoutSession.groupBy({
      by: ["userId"],
      where: { startedAt: { gte: sevenDaysAgo } },
    }).then((r) => r.length),

    prisma.workoutSession.count(),

    prisma.workoutSet.count({ where: { completed: true } }),

    prisma.feedback.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Top 10 most logged exercises
    prisma.sessionExercise.groupBy({
      by: ["exerciseId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }).then(async (rows) => {
      const ids = rows.map((r) => r.exerciseId);
      const exercises = await prisma.exercise.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, muscleGroup: true },
      });
      const map = Object.fromEntries(exercises.map((e) => [e.id, e]));
      return rows.map((r) => ({ ...map[r.exerciseId], count: r._count.id }));
    }),

    // Sessions per day for last 30 days
    prisma.workoutSession.findMany({
      where: { startedAt: { gte: thirtyDaysAgo } },
      select: { startedAt: true },
      orderBy: { startedAt: "asc" },
    }).then((sessions) => {
      const map: Record<string, number> = {};
      for (const s of sessions) {
        const day = s.startedAt.toISOString().split("T")[0];
        map[day] = (map[day] ?? 0) + 1;
      }
      return Object.entries(map).map(([date, count]) => ({ date, count }));
    }),

    // New users per day for last 30 days
    prisma.workoutUser.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }).then((users) => {
      const map: Record<string, number> = {};
      for (const u of users) {
        const day = u.createdAt.toISOString().split("T")[0];
        map[day] = (map[day] ?? 0) + 1;
      }
      return Object.entries(map).map(([date, count]) => ({ date, count }));
    }),
  ]);

  const feedbackByStatus = Object.fromEntries(
    feedbackCounts.map((r) => [r.status, r._count.id])
  );

  return NextResponse.json({
    totalUsers,
    activeUsers30d,
    activeUsers7d,
    totalSessions,
    totalSets,
    feedbackByStatus,
    topExercises,
    sessionsPerDay,
    newUsersPerDay,
  });
}

export const GET = withAdmin(getAdminStats);
