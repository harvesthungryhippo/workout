import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function listTournaments(req: AuthedRequest) {
  const tournaments = await prisma.tournament.findMany({
    where: { userId: req.session.userId },
    include: {
      participants: { select: { id: true } },
      matches: { select: { id: true, winnerId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tournaments);
}

async function createTournament(req: AuthedRequest) {
  const body = await req.json();
  const { name, description, metric, unit } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const tournament = await prisma.tournament.create({
    data: {
      userId: req.session.userId,
      name: name.trim(),
      description: description?.trim() || null,
      metric: metric?.trim() || null,
      unit: unit?.trim() || null,
    },
  });
  return NextResponse.json(tournament, { status: 201 });
}

export const GET = withAuth(listTournaments);
export const POST = withAuth(createTournament);
