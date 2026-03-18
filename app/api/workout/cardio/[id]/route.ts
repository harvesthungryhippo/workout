import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// PATCH /api/workout/cardio/[id]
const updateSchema = z.object({
  notes: z.string().optional(),
  distanceMeters: z.number().min(0).optional(),
  calories: z.number().int().min(0).optional(),
  avgHeartRate: z.number().int().min(0).optional(),
  maxHeartRate: z.number().int().min(0).optional(),
  inclinePercent: z.number().min(0).max(30).optional(),
  speedKmh: z.number().min(0).optional(),
  treadmillMode: z.string().optional(),
});

async function updateSession(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const session = await prisma.cardioSession.findFirst({ where: { id, userId: req.session.userId } });
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  const updated = await prisma.cardioSession.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

// DELETE /api/workout/cardio/[id]
async function deleteSession(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const session = await prisma.cardioSession.findFirst({ where: { id, userId: req.session.userId } });
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.cardioSession.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withAuth(updateSession);
export const DELETE = withAuth(deleteSession);
