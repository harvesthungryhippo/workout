import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/** Public read-only endpoint — no auth required. Returns only display-safe fields. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      sport: true,
      metric: true,
      unit: true,
      createdAt: true,
      participants: {
        select: { id: true, name: true, seed: true },
        orderBy: { seed: "asc" },
      },
      matches: {
        select: {
          id: true,
          round: true,
          matchIndex: true,
          participant1Id: true,
          participant2Id: true,
          winnerId: true,
          score1: true,
          score2: true,
          participant1: { select: { id: true, name: true, seed: true } },
          participant2: { select: { id: true, name: true, seed: true } },
          winner: { select: { id: true, name: true, seed: true } },
        },
        orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tournament, {
    headers: { "Cache-Control": "no-store" },
  });
}
