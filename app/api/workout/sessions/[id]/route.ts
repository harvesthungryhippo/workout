import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// GET /api/workout/sessions/[id]
async function getSession(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: req.session.userId },
      include: {
        exercises: {
          include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(session);
  } catch (e) {
    console.error("[sessions/[id] GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/workout/sessions/[id] — complete session or add notes
const patchSchema = z.object({
  name: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  durationSeconds: z.number().int().min(0).optional(),
  completedAt: z.string().datetime().optional(),
});

async function updateSession(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: req.session.userId },
    });
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

    let body: z.infer<typeof patchSchema>;
    try {
      body = patchSchema.parse(await req.json());
    } catch (e) {
      return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
    }

    const updated = await prisma.workoutSession.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        notes: body.notes,
        durationSeconds: body.durationSeconds,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[sessions/[id] PATCH] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/workout/sessions/[id]
async function deleteSession(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: req.session.userId },
    });
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

    await prisma.workoutSession.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sessions/[id] DELETE] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getSession);
export const PATCH = withAuth(updateSession);
export const DELETE = withAuth(deleteSession);
