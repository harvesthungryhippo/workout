import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

async function getTournament(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { seed: "asc" } },
      matches: {
        orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
        include: {
          participant1: true,
          participant2: true,
          winner: true,
        },
      },
    },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(tournament);
}

async function updateTournament(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, description, metric, unit } = body;
  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(metric !== undefined ? { metric: metric?.trim() || null } : {}),
      ...(unit !== undefined ? { unit: unit?.trim() || null } : {}),
    },
  });
  return NextResponse.json(updated);
}

async function deleteTournament(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.userId !== req.session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const GET = withAuth(getTournament);
export const PUT = withAuth(updateTournament);
export const DELETE = withAuth(deleteTournament);
