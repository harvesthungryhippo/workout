import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// GET /api/workout/programs/[id]
async function getProgram(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const program = await prisma.workoutProgram.findFirst({
      where: { id, userId: req.session.userId },
      include: {
        days: {
          include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!program) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(program);
  } catch (e) {
    console.error("[programs/[id] GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/workout/programs/[id]
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  durationWeeks: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
});

async function updateProgram(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const program = await prisma.workoutProgram.findFirst({
      where: { id, userId: req.session.userId },
    });
    if (!program) return NextResponse.json({ error: "Not found." }, { status: 404 });

    let body: z.infer<typeof patchSchema>;
    try {
      body = patchSchema.parse(await req.json());
    } catch (e) {
      return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
    }

    if (body.active) {
      await prisma.workoutProgram.updateMany({
        where: { userId: req.session.userId, active: true },
        data: { active: false },
      });
    }

    const updated = await prisma.workoutProgram.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[programs/[id] PATCH] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/workout/programs/[id]
async function deleteProgram(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const program = await prisma.workoutProgram.findFirst({
      where: { id, userId: req.session.userId },
    });
    if (!program) return NextResponse.json({ error: "Not found." }, { status: 404 });

    await prisma.workoutProgram.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[programs/[id] DELETE] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getProgram);
export const PATCH = withAuth(updateProgram);
export const DELETE = withAuth(deleteProgram);
