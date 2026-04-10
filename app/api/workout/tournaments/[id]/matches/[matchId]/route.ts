import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function reportResult(req: AuthedRequest, ctx: Params) {
  const { id, matchId } = await ctx.params;
  const body = await req.json();
  const { winnerId, score1, score2 } = body;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tournament is not active" }, { status: 400 });
  }

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (!match.participant1Id || !match.participant2Id) {
    return NextResponse.json({ error: "Match participants not yet set" }, { status: 400 });
  }
  if (winnerId && winnerId !== match.participant1Id && winnerId !== match.participant2Id) {
    return NextResponse.json({ error: "Winner must be one of the match participants" }, { status: 400 });
  }

  const prevWinnerId = match.winnerId;

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      winnerId: winnerId ?? null,
      score1: score1 ?? null,
      score2: score2 ?? null,
    },
  });

  // Find the maximum round to know if this is the final
  const agg = await prisma.tournamentMatch.aggregate({
    where: { tournamentId: id },
    _max: { round: true },
  });
  const maxRound = agg._max.round ?? 1;

  if (match.round >= maxRound) {
    // This is the final match
    if (winnerId) {
      await prisma.tournament.update({ where: { id }, data: { status: "COMPLETED" } });
    } else {
      // Result cleared — revert to ACTIVE if it was COMPLETED
      await prisma.tournament.update({ where: { id }, data: { status: "ACTIVE" } });
    }
    return NextResponse.json({ ok: true });
  }

  // Advance winner to next match slot
  const nextMatchIndex = Math.floor(match.matchIndex / 2);
  const nextMatch = await prisma.tournamentMatch.findFirst({
    where: { tournamentId: id, round: match.round + 1, matchIndex: nextMatchIndex },
  });
  if (!nextMatch) return NextResponse.json({ ok: true });

  const fillsP1 = match.matchIndex % 2 === 0;
  const slotField = fillsP1 ? "participant1Id" : "participant2Id";

  // Only update the slot if it held the previous winner (avoid overwriting an unrelated participant)
  const slotCurrentValue = fillsP1 ? nextMatch.participant1Id : nextMatch.participant2Id;
  if (slotCurrentValue === null || slotCurrentValue === prevWinnerId) {
    await prisma.tournamentMatch.update({
      where: { id: nextMatch.id },
      data: { [slotField]: winnerId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}

/** PATCH: update live running scores only — does NOT advance winner or change tournament status */
async function updateLiveScore(req: AuthedRequest, ctx: Params) {
  const { id, matchId } = await ctx.params;
  const body = await req.json();
  const { score1, score2 } = body;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "ACTIVE") return NextResponse.json({ error: "Tournament not active" }, { status: 400 });

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== id) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      score1: score1 !== undefined ? score1 : match.score1,
      score2: score2 !== undefined ? score2 : match.score2,
    },
  });

  return NextResponse.json({ ok: true });
}

export const PUT = withAuth(reportResult);
export const PATCH = withAuth(updateLiveScore);
