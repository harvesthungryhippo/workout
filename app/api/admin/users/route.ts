import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin, type AuthedRequest } from "@/lib/api/withAdmin";
import type { Params } from "@/lib/api/withAuth";

async function getUsers(_req: AuthedRequest, _ctx: Params) {
  const users = await prisma.workoutUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      orgRole: true,
      emailVerified: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Attach session counts
  const sessionCounts = await prisma.workoutSession.groupBy({
    by: ["userId"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(sessionCounts.map((r) => [r.userId, r._count.id]));

  return NextResponse.json(users.map((u) => ({ ...u, sessionCount: countMap[u.id] ?? 0 })));
}

export const GET = withAdmin(getUsers);
