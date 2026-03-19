import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

export const SYSTEM_LEGENDARY_USER = "SYSTEM_LEGENDARY";

// GET /api/workout/legendary — list public legendary programs + which ones the user has copied
async function getLegendaryPrograms(req: AuthedRequest) {
  const [legendary, userPrograms] = await Promise.all([
    prisma.workoutProgram.findMany({
      where: { userId: SYSTEM_LEGENDARY_USER },
      include: {
        days: {
          include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
          orderBy: { dayNumber: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workoutProgram.findMany({
      where: { userId: req.session.userId },
      select: { id: true, name: true, active: true },
    }),
  ]);

  const userProgramNames = new Set(userPrograms.map((p) => p.name));

  return NextResponse.json({
    programs: legendary.map((p) => ({
      ...p,
      addedToMyPrograms: userProgramNames.has(p.name),
      myProgramId: userPrograms.find((up) => up.name === p.name)?.id ?? null,
      myProgramActive: userPrograms.find((up) => up.name === p.name)?.active ?? false,
    })),
  });
}

// POST /api/workout/legendary — copy a legendary program to the user's account
async function copyLegendaryProgram(req: AuthedRequest) {
  const { programId } = await req.json();

  const source = await prisma.workoutProgram.findFirst({
    where: { id: programId, userId: SYSTEM_LEGENDARY_USER },
    include: {
      days: {
        include: { exercises: true },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Program not found." }, { status: 404 });

  // Check if user already has this program
  const existing = await prisma.workoutProgram.findFirst({
    where: { userId: req.session.userId, name: source.name },
  });
  if (existing) return NextResponse.json({ error: "Already in your programs." }, { status: 409 });

  const copy = await prisma.workoutProgram.create({
    data: {
      userId: req.session.userId,
      name: source.name,
      description: source.description,
      daysPerWeek: source.daysPerWeek,
      durationWeeks: source.durationWeeks,
      active: false,
      days: {
        create: source.days.map((day) => ({
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
        include: { exercises: { include: { exercise: true } } },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  return NextResponse.json(copy, { status: 201 });
}

export const GET = withAuth(getLegendaryPrograms);
export const POST = withAuth(copyLegendaryProgram);
