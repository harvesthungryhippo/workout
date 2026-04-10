import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

/** Standard single-elimination seeding positions for a bracket of the given power-of-2 size. */
function getSeedPositions(bracketSize: number): number[] {
  let positions = [1, 2];
  while (positions.length < bracketSize) {
    const newSize = positions.length * 2;
    const next: number[] = [];
    for (const p of positions) next.push(p, newSize + 1 - p);
    positions = next;
  }
  return positions;
}

async function startTournament(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: { orderBy: { seed: "asc" } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "DRAFT") {
    return NextResponse.json({ error: "Tournament already started" }, { status: 400 });
  }

  const participants = tournament.participants;
  const n = participants.length;
  if (n < 2) return NextResponse.json({ error: "Need at least 2 participants" }, { status: 400 });

  // Find smallest power of 2 >= n
  let bracketSize = 1;
  while (bracketSize < n) bracketSize *= 2;
  const numRounds = Math.log2(bracketSize);

  type MatchData = {
    id: string;
    tournamentId: string;
    round: number;
    matchIndex: number;
    participant1Id: string | null;
    participant2Id: string | null;
    winnerId: string | null;
    score1: number | null;
    score2: number | null;
  };

  const matchMap = new Map<string, MatchData>();
  const allMatches: MatchData[] = [];

  // Create placeholder for every slot across all rounds
  for (let round = 1; round <= numRounds; round++) {
    const numMatches = bracketSize / Math.pow(2, round);
    for (let matchIndex = 0; matchIndex < numMatches; matchIndex++) {
      const match: MatchData = {
        id: randomUUID(),
        tournamentId: id,
        round,
        matchIndex,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
        score1: null,
        score2: null,
      };
      matchMap.set(`${round}-${matchIndex}`, match);
      allMatches.push(match);
    }
  }

  // Assign round-1 participants using standard seeding
  const seedPositions = getSeedPositions(bracketSize);
  const r1Count = bracketSize / 2;
  for (let i = 0; i < r1Count; i++) {
    const match = matchMap.get(`1-${i}`)!;
    const p1Seed = seedPositions[i * 2];
    const p2Seed = seedPositions[i * 2 + 1];
    match.participant1Id = p1Seed <= n ? participants[p1Seed - 1].id : null;
    match.participant2Id = p2Seed <= n ? participants[p2Seed - 1].id : null;
  }

  // Propagate BYEs forward through all rounds
  for (let round = 1; round < numRounds; round++) {
    const numMatches = bracketSize / Math.pow(2, round);
    for (let matchIndex = 0; matchIndex < numMatches; matchIndex++) {
      const match = matchMap.get(`${round}-${matchIndex}`)!;
      const p1 = match.participant1Id;
      const p2 = match.participant2Id;
      const nextIdx = Math.floor(matchIndex / 2);
      const nextMatch = matchMap.get(`${round + 1}-${nextIdx}`)!;
      const fillP1 = matchIndex % 2 === 0;

      if (p1 && !p2) {
        match.winnerId = p1;
        if (fillP1) nextMatch.participant1Id = p1;
        else nextMatch.participant2Id = p1;
      } else if (!p1 && p2) {
        match.winnerId = p2;
        if (fillP1) nextMatch.participant1Id = p2;
        else nextMatch.participant2Id = p2;
      }
    }
  }

  await prisma.$transaction([
    prisma.tournamentMatch.createMany({ data: allMatches }),
    prisma.tournament.update({ where: { id }, data: { status: "ACTIVE" } }),
  ]);

  return NextResponse.json({ ok: true });
}

export const POST = withAuth(startTournament);
