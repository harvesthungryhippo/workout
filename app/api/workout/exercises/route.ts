import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { ExerciseCategory, ExerciseEquipment, MuscleGroup } from "@prisma/client";

// GET /api/workout/exercises — list exercises with optional filters
async function getExercises(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const muscleGroup = searchParams.get("muscleGroup") ?? undefined;
  const equipment = searchParams.get("equipment") ?? undefined;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(category ? { category: category as ExerciseCategory } : {}),
      ...(muscleGroup ? { muscleGroup: muscleGroup as MuscleGroup } : {}),
      ...(equipment ? { equipment: equipment as ExerciseEquipment } : {}),
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ exercises });
}

// POST /api/workout/exercises — create a custom exercise
const createSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(ExerciseCategory),
  muscleGroup: z.nativeEnum(MuscleGroup),
  equipment: z.nativeEnum(ExerciseEquipment).optional(),
  instructions: z.string().optional(),
});

async function createExercise(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  const exercise = await prisma.exercise.create({
    data: {
      name: body.name,
      category: body.category,
      muscleGroup: body.muscleGroup,
      equipment: body.equipment ?? ExerciseEquipment.NONE,
      instructions: body.instructions,
    },
  });

  return NextResponse.json(exercise, { status: 201 });
}

export const GET = withAuth(getExercises);
export const POST = withAuth(createExercise);
