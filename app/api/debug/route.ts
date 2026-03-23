import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const results: Record<string, string> = {};

  // Basic connectivity
  try { await prisma.$queryRaw`SELECT 1`; results.db = "ok"; }
  catch (e) { results.db = String(e); }

  // Check each key table for column issues
  const checks: [string, () => Promise<unknown>][] = [
    ["WorkoutSession.cols", () => prisma.$queryRaw`SELECT id, "userId", name, "startedAt", "completedAt", "durationSeconds", notes, "programId", "programDayId" FROM "WorkoutSession" LIMIT 0`],
    ["WorkoutSet.cols", () => prisma.$queryRaw`SELECT id, "sessionExerciseId", "setNumber", reps, "weightKg", "durationSeconds", completed, rpe FROM "WorkoutSet" LIMIT 0`],
    ["SessionExercise.cols", () => prisma.$queryRaw`SELECT id, "sessionId", "exerciseId", "order", notes, "supersetGroup" FROM "SessionExercise" LIMIT 0`],
    ["Exercise.cols", () => prisma.$queryRaw`SELECT id, name, category, "muscleGroup", equipment FROM "Exercise" LIMIT 0`],
    ["WorkoutProgram", () => prisma.workoutProgram.findFirst()],
    ["WorkoutTemplate", () => prisma.workoutTemplate.findFirst()],
  ];

  for (const [name, fn] of checks) {
    try { await fn(); results[name] = "ok"; }
    catch (e) { results[name] = String(e); }
  }

  return NextResponse.json(results);
}
