import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

// POST /api/workout/sessions/[id]/exercises — add an exercise to an in-progress session
const createSchema = z.object({
  exerciseId: z.string(),
  order: z.number().int(),
  notes: z.string().optional(),
  initialSets: z.number().int().min(1).default(3),
});

async function addExercise(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const session = await prisma.workoutSession.findFirst({
      where: { id, userId: req.session.userId },
    });
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (session.completedAt) {
      return NextResponse.json({ error: "Session already completed." }, { status: 400 });
    }

    let body: z.infer<typeof createSchema>;
    try {
      body = createSchema.parse(await req.json());
    } catch (e) {
      return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
    }

    const sessionExercise = await prisma.sessionExercise.create({
      data: {
        sessionId: id,
        exerciseId: body.exerciseId,
        order: body.order,
        notes: body.notes,
        sets: {
          create: Array.from({ length: body.initialSets }, (_, i) => ({
            setNumber: i + 1,
            completed: false,
          })),
        },
      },
      include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
    });

    return NextResponse.json(sessionExercise, { status: 201 });
  } catch (e) {
    console.error("[sessions/[id]/exercises POST] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const POST = withAuth(addExercise);
