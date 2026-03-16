import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/programs — list programs for the current user
async function getPrograms(req: AuthedRequest) {
  const programs = await prisma.workoutProgram.findMany({
    where: { userId: req.session.userId },
    include: {
      days: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { dayNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ programs });
}

// POST /api/workout/programs — create a new program
const dayExerciseSchema = z.object({
  exerciseId: z.string(),
  order: z.number().int(),
  sets: z.number().int().min(1).default(3),
  reps: z.string().default("8-12"),
  restSeconds: z.number().int().min(0).default(90),
  notes: z.string().optional(),
});

const daySchema = z.object({
  dayNumber: z.number().int().min(1),
  name: z.string().min(1),
  exercises: z.array(dayExerciseSchema),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  durationWeeks: z.number().int().min(1).default(8),
  active: z.boolean().default(false),
  days: z.array(daySchema),
});

async function createProgram(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  // If setting as active, deactivate all other programs for this user
  if (body.active) {
    await prisma.workoutProgram.updateMany({
      where: { userId: req.session.userId, active: true },
      data: { active: false },
    });
  }

  const program = await prisma.workoutProgram.create({
    data: {
      userId: req.session.userId,
      name: body.name,
      description: body.description,
      daysPerWeek: body.daysPerWeek,
      durationWeeks: body.durationWeeks,
      active: body.active,
      days: {
        create: body.days.map((day) => ({
          dayNumber: day.dayNumber,
          name: day.name,
          exercises: {
            create: day.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              order: ex.order,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
              notes: ex.notes,
            })),
          },
        })),
      },
    },
    include: {
      days: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  return NextResponse.json(program, { status: 201 });
}

export const GET = withAuth(getPrograms);
export const POST = withAuth(createProgram);
