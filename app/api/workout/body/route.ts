import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getEntries(req: AuthedRequest) {
  try {
    const entries = await prisma.bodyEntry.findMany({
      where: { userId: req.session.userId },
      orderBy: { date: "desc" },
      take: 365,
    });
    return NextResponse.json(entries);
  } catch (e) {
    console.error("[body GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function createEntry(req: AuthedRequest) {
  try {
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
  } catch (e) {
    console.error("[body POST] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getEntries);
export const POST = withAuth(createEntry);
