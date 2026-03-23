import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

export const SYSTEM_CORE_USER = "SYSTEM_CORE";

// GET /api/workout/core-programs — list core programs + which ones the user has added
async function getCorePrograms(req: AuthedRequest) {
  try {
    const [corePrograms, userPrograms] = await Promise.all([
      prisma.workoutProgram.findMany({
        where: { userId: SYSTEM_CORE_USER },
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
      programs: corePrograms.map((p) => ({
        ...p,
        addedToMyPrograms: userProgramNames.has(p.name),
        myProgramId: userPrograms.find((up) => up.name === p.name)?.id ?? null,
        myProgramActive: userPrograms.find((up) => up.name === p.name)?.active ?? false,
      })),
    });
  } catch (e) {
    console.error("[core-programs GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/workout/core-programs — copy a core program to the user's account
async function copyCoreProgram(req: AuthedRequest) {
  try {
    const { programId } = await req.json();

    const source = await prisma.workoutProgram.findFirst({
      where: { id: programId, userId: SYSTEM_CORE_USER },
      include: {
        days: {
          include: { exercises: true },
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!source) return NextResponse.json({ error: "Program not found." }, { status: 404 });

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
  } catch (e) {
    console.error("[core-programs POST] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getCorePrograms);
export const POST = withAuth(copyCoreProgram);
