import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function addParticipant(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { participants: { select: { id: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "DRAFT") {
    return NextResponse.json({ error: "Cannot add participants after tournament starts" }, { status: 400 });
  }
  const body = await req.json();
  const { name } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (tournament.participants.length >= 32) {
    return NextResponse.json({ error: "Maximum 32 participants" }, { status: 400 });
  }
  const seed = tournament.participants.length + 1;
  const participant = await prisma.tournamentParticipant.create({
    data: { tournamentId: id, name: name.trim(), seed },
  });
  return NextResponse.json(participant, { status: 201 });
}

async function removeParticipant(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const participantId = searchParams.get("participantId");
  if (!participantId) return NextResponse.json({ error: "participantId required" }, { status: 400 });

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "DRAFT") {
    return NextResponse.json({ error: "Cannot remove participants after tournament starts" }, { status: 400 });
  }

  await prisma.tournamentParticipant.deleteMany({
    where: { id: participantId, tournamentId: id },
  });

  // Re-seed remaining participants
  const remaining = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: id },
    orderBy: { seed: "asc" },
  });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.tournamentParticipant.update({
      where: { id: remaining[i].id },
      data: { seed: i + 1 },
    });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withAuth(addParticipant);
export const DELETE = withAuth(removeParticipant);
