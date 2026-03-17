import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getTemplates(req: AuthedRequest) {
  const templates = await prisma.workoutTemplate.findMany({
    where: { userId: req.session.userId },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

async function createTemplate(req: AuthedRequest) {
  const body = await req.json();
  const template = await prisma.workoutTemplate.create({
    data: {
      userId: req.session.userId,
      name: body.name,
      exercises: {
        create: (body.exercises ?? []).map(
          (ex: { exerciseId: string; order: number; sets: number; reps: string; restSeconds: number }, i: number) => ({
            exerciseId: ex.exerciseId,
            order: ex.order ?? i,
            sets: ex.sets ?? 3,
            reps: ex.reps ?? "8-12",
            restSeconds: ex.restSeconds ?? 90,
          })
        ),
      },
    },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
    },
  });
  return NextResponse.json(template, { status: 201 });
}

export const GET = withAuth(getTemplates);
export const POST = withAuth(createTemplate);
