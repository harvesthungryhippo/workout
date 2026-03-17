import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getSleep(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "30");

  const entries = await prisma.sleepEntry.findMany({
    where: { userId: req.session.userId },
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json({ entries });
}

const createSchema = z.object({
  durationMins: z.number().int().positive(),
  quality: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

async function createEntry(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const entry = await prisma.sleepEntry.create({
    data: {
      userId: req.session.userId,
      durationMins: body.durationMins,
      quality: body.quality ?? null,
      notes: body.notes ?? null,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export const GET = withAuth(getSleep);
export const POST = withAuth(createEntry);
