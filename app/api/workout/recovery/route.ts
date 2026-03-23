import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getRecovery(req: AuthedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "30");

    const entries = await prisma.recoveryEntry.findMany({
      where: { userId: req.session.userId },
      orderBy: { date: "desc" },
      take: limit,
    });
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("[recovery GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const createSchema = z.object({
  overallScore: z.number().int().min(1).max(10).optional(),
  sorenessAreas: z.array(z.string()).optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

async function createEntry(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const entry = await prisma.recoveryEntry.create({
    data: {
      userId: req.session.userId,
      overallScore: body.overallScore ?? null,
      sorenessAreas: body.sorenessAreas ?? [],
      notes: body.notes ?? null,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export const GET = withAuth(getRecovery);
export const POST = withAuth(createEntry);
