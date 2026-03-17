import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function exportData(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "sessions"; // sessions | nutrition | body

  if (type === "sessions") {
    const sessions = await prisma.workoutSession.findMany({
      where: { userId: req.session.userId },
      orderBy: { startedAt: "desc" },
      include: {
        exercises: {
          include: {
            exercise: { select: { name: true, muscleGroup: true } },
            sets: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    const rows: string[] = [
      "Date,Session Name,Exercise,Muscle Group,Set #,Reps,Weight (lb),RPE,Completed",
    ];

    for (const session of sessions) {
      const date = new Date(session.startedAt).toLocaleDateString();
      const name = session.name ?? "Workout";
      for (const ex of session.exercises) {
        for (const set of ex.sets) {
          rows.push([
            date,
            name,
            ex.exercise.name,
            ex.exercise.muscleGroup,
            set.setNumber,
            set.reps ?? "",
            set.weightKg ? (parseFloat(set.weightKg.toString()) * 2.20462).toFixed(1) : "",
            set.rpe ?? "",
            set.completed ? "Yes" : "No",
          ].map((v) => `"${v}"`).join(","));
        }
      }
    }

    const csv = rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="workout-sessions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "nutrition") {
    const entries = await prisma.nutritionEntry.findMany({
      where: { userId: req.session.userId },
      orderBy: { date: "desc" },
    });

    const rows = [
      "Date,Meal,Calories,Protein (g),Carbs (g),Fat (g),Notes",
      ...entries.map((e) =>
        [
          new Date(e.date).toLocaleDateString(),
          e.mealName,
          e.calories ?? "",
          e.proteinG ?? "",
          e.carbsG ?? "",
          e.fatG ?? "",
          e.notes ?? "",
        ].map((v) => `"${v}"`).join(",")
      ),
    ];

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="nutrition-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "body") {
    const entries = await prisma.bodyEntry.findMany({
      where: { userId: req.session.userId },
      orderBy: { date: "desc" },
    });

    const rows = [
      "Date,Weight (lb),Body Fat %,Neck (in),Chest (in),Waist (in),Hips (in),Arms (in),Thighs (in),Notes",
      ...entries.map((e) =>
        [
          new Date(e.date).toLocaleDateString(),
          e.weightLbs ?? "",
          e.bodyFatPct ?? "",
          e.neckIn ?? "",
          e.chestIn ?? "",
          e.waistIn ?? "",
          e.hipsIn ?? "",
          e.armsIn ?? "",
          e.thighsIn ?? "",
          e.notes ?? "",
        ].map((v) => `"${v}"`).join(",")
      ),
    ];

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="body-measurements-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
}

export const GET = withAuth(exportData);
