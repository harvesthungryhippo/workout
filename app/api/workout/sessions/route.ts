import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/sessions — list recent sessions for the user
async function getSessions(req: AuthedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "20"));
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter = from || to ? {
      startedAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to)   } : {}),
      },
    } : {};

    const where = { userId: req.session.userId, ...dateFilter };

    const [sessions, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where,
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: { orderBy: { setNumber: "asc" } },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workoutSession.count({ where }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
  } catch (e) {
    console.error("[sessions GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/workout/sessions — start a new session
const createSchema = z.object({
  name: z.string().optional(),
  programId: z.string().optional(),
  programDayId: z.string().optional(),
  templateId: z.string().optional(),
  repeatSessionId: z.string().optional(),
});

async function createSession(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  // If starting from a program day, pre-populate exercises
  let exercisesData: {
    exerciseId: string;
    order: number;
    notes: string | null;
    sets: { create: { setNumber: number; reps: null; weightKg: null; completed: false }[] };
  }[] = [];

  if (body.programDayId) {
    const programDay = await prisma.programDay.findFirst({
      where: { id: body.programDayId },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    if (programDay) {
      exercisesData = programDay.exercises.map((pe) => ({
        exerciseId: pe.exerciseId,
        order: pe.order,
        notes: pe.notes,
        sets: {
          create: Array.from({ length: pe.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: null,
            weightKg: null,
            completed: false as const,
          })),
        },
      }));
    }
  } else if (body.repeatSessionId) {
    const prev = await prisma.workoutSession.findFirst({
      where: { id: body.repeatSessionId, userId: req.session.userId },
      include: { exercises: { include: { sets: true }, orderBy: { order: "asc" } } },
    });
    if (prev) {
      exercisesData = prev.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        notes: ex.notes,
        sets: {
          create: Array.from({ length: Math.max(ex.sets.length, 1) }, (_, i) => ({
            setNumber: i + 1,
            reps: null,
            weightKg: null,
            completed: false as const,
          })),
        },
      }));
    }
  } else if (body.templateId) {
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: body.templateId },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    if (template) {
      exercisesData = template.exercises.map((te) => ({
        exerciseId: te.exerciseId,
        order: te.order,
        notes: null,
        sets: {
          create: Array.from({ length: te.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: null,
            weightKg: null,
            completed: false as const,
          })),
        },
      }));
    }
  }

  try {
    const session = await prisma.workoutSession.create({
      data: {
        userId: req.session.userId,
        name: body.name,
        programId: body.programId,
        programDayId: body.programDayId,
        exercises: exercisesData.length > 0 ? { create: exercisesData } : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    console.error("session create error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getSessions);
export const POST = withAuth(createSession);
