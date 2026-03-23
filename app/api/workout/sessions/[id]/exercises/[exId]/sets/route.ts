import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// PATCH /api/workout/sessions/[id]/exercises/[exId]/sets — update a set
const updateSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
});

async function updateSet(req: AuthedRequest, ctx: Params) {
  try {
    const { id, exId } = await ctx.params;

    // Verify session belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: req.session.userId },
    });
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const sessionExercise = await prisma.sessionExercise.findFirst({
      where: { id: exId, sessionId: id },
    });
    if (!sessionExercise) return NextResponse.json({ error: "Exercise not found." }, { status: 404 });

    let body: z.infer<typeof updateSchema>;
    try {
      body = updateSchema.parse(await req.json());
    } catch (e) {
      return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
    }

    const workoutSet = await prisma.workoutSet.upsert({
      where: {
        sessionExerciseId_setNumber: {
          sessionExerciseId: exId,
          setNumber: body.setNumber,
        },
      },
      update: {
        reps: body.reps,
        weightKg: body.weightKg,
        durationSeconds: body.durationSeconds,
        completed: body.completed,
        rpe: body.rpe,
      },
      create: {
        sessionExerciseId: exId,
        setNumber: body.setNumber,
        reps: body.reps,
        weightKg: body.weightKg,
        durationSeconds: body.durationSeconds,
        completed: body.completed ?? false,
        rpe: body.rpe,
      },
    });

    return NextResponse.json(workoutSet);
  } catch (e) {
    console.error("[sessions/[id]/exercises/[exId]/sets PATCH] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const PATCH = withAuth(updateSet);
