import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const MIGRATIONS = [
  `ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER`,
  `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER`,
  `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "name" TEXT`,
  `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
  `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "programId" TEXT`,
  `ALTER TABLE "WorkoutSession" ADD COLUMN IF NOT EXISTS "programDayId" TEXT`,
  `ALTER TABLE "SessionExercise" ADD COLUMN IF NOT EXISTS "supersetGroup" INTEGER`,
  `ALTER TABLE "SessionExercise" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
  `ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "rpe" INTEGER`,
];

// POST /api/admin/migrate
// Protected by JWT_SECRET in Authorization header
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.JWT_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of MIGRATIONS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push({ sql, ok: true });
    } catch (e) {
      results.push({ sql, ok: false, error: String(e) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ ok: failed.length === 0, results }, {
    status: failed.length === 0 ? 200 : 207,
  });
}
