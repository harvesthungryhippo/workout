import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getWater(req: AuthedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const where: Record<string, unknown> = { userId: req.session.userId };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    }

    const entries = await prisma.waterEntry.findMany({ where, orderBy: { date: "desc" } });
    const totalMl = entries.reduce((sum, e) => sum + e.amountMl, 0);
    return NextResponse.json({ entries, totalMl });
  } catch (e) {
    console.error("[water GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const createSchema = z.object({
  amountMl: z.number().int().positive(),
  date: z.string().optional(),
});

async function addWater(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const entry = await prisma.waterEntry.create({
    data: {
      userId: req.session.userId,
      amountMl: body.amountMl,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export const GET = withAuth(getWater);
export const POST = withAuth(addWater);
