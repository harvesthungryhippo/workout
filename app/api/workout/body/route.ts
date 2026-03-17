import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getEntries(req: AuthedRequest) {
  const entries = await prisma.bodyEntry.findMany({
    where: { userId: req.session.userId },
    orderBy: { date: "desc" },
    take: 365,
  });
  return NextResponse.json(entries);
}

async function createEntry(req: AuthedRequest) {
  const body = await req.json();
  const entry = await prisma.bodyEntry.create({
    data: {
      userId: req.session.userId,
      date: body.date ? new Date(body.date) : new Date(),
      weightLbs: body.weightLbs ?? null,
      bodyFatPct: body.bodyFatPct ?? null,
      neckIn: body.neckIn ?? null,
      chestIn: body.chestIn ?? null,
      waistIn: body.waistIn ?? null,
      hipsIn: body.hipsIn ?? null,
      armsIn: body.armsIn ?? null,
      thighsIn: body.thighsIn ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export const GET = withAuth(getEntries);
export const POST = withAuth(createEntry);
