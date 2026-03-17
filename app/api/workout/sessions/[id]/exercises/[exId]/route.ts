import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

const updateSchema = z.object({
  notes: z.string().nullable().optional(),
  supersetGroup: z.number().int().min(1).nullable().optional(),
});

async function updateExercise(req: AuthedRequest, ctx: Params) {
  const { id, exId } = await ctx.params;

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: req.session.userId },
  });
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: z.infer<typeof updateSchema>;
  try { body = updateSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const updated = await prisma.sessionExercise.update({
    where: { id: exId },
    data: {
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.supersetGroup !== undefined ? { supersetGroup: body.supersetGroup } : {}),
    },
  });

  return NextResponse.json(updated);
}

async function removeExercise(req: AuthedRequest, ctx: Params) {
  const { id, exId } = await ctx.params;

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: req.session.userId },
  });
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.sessionExercise.delete({ where: { id: exId } });
  return NextResponse.json({ ok: true });
}

export const PATCH = withAuth(updateExercise);
export const DELETE = withAuth(removeExercise);
