import { Pool } from "pg";

const sql = `
-- New columns on existing tables
ALTER TABLE "SessionExercise" ADD COLUMN IF NOT EXISTS "supersetGroup" INTEGER;
ALTER TABLE "WorkoutSet" ADD COLUMN IF NOT EXISTS "rpe" INTEGER;
ALTER TABLE "WorkoutUser" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- New tables
CREATE TABLE IF NOT EXISTS "BodyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightLbs" DECIMAL(5,1),
    "bodyFatPct" DECIMAL(4,1),
    "neckIn" DECIMAL(4,1),
    "chestIn" DECIMAL(4,1),
    "waistIn" DECIMAL(4,1),
    "hipsIn" DECIMAL(4,1),
    "armsIn" DECIMAL(4,1),
    "thighsIn" DECIMAL(4,1),
    "notes" TEXT,
    CONSTRAINT "BodyEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TemplateExercise" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '8-12',
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    CONSTRAINT "TemplateExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exerciseId" TEXT,
    "targetValue" DECIMAL(8,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NutritionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealName" TEXT NOT NULL,
    "calories" INTEGER,
    "proteinG" DECIMAL(6,1),
    "carbsG" DECIMAL(6,1),
    "fatG" DECIMAL(6,1),
    "notes" TEXT,
    CONSTRAINT "NutritionEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WaterEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountMl" INTEGER NOT NULL,
    CONSTRAINT "WaterEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SleepEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMins" INTEGER NOT NULL,
    "quality" INTEGER,
    "notes" TEXT,
    CONSTRAINT "SleepEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecoveryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" INTEGER,
    "sorenessAreas" TEXT[],
    "notes" TEXT,
    CONSTRAINT "RecoveryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkoutReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "WorkoutReminder_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "BodyEntry_userId_idx" ON "BodyEntry"("userId");
CREATE INDEX IF NOT EXISTS "BodyEntry_date_idx" ON "BodyEntry"("date");
CREATE INDEX IF NOT EXISTS "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");
CREATE INDEX IF NOT EXISTS "TemplateExercise_templateId_idx" ON "TemplateExercise"("templateId");
CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX IF NOT EXISTS "NutritionEntry_userId_idx" ON "NutritionEntry"("userId");
CREATE INDEX IF NOT EXISTS "NutritionEntry_date_idx" ON "NutritionEntry"("date");
CREATE INDEX IF NOT EXISTS "WaterEntry_userId_idx" ON "WaterEntry"("userId");
CREATE INDEX IF NOT EXISTS "WaterEntry_date_idx" ON "WaterEntry"("date");
CREATE INDEX IF NOT EXISTS "SleepEntry_userId_idx" ON "SleepEntry"("userId");
CREATE INDEX IF NOT EXISTS "SleepEntry_date_idx" ON "SleepEntry"("date");
CREATE INDEX IF NOT EXISTS "RecoveryEntry_userId_idx" ON "RecoveryEntry"("userId");
CREATE INDEX IF NOT EXISTS "RecoveryEntry_date_idx" ON "RecoveryEntry"("date");
CREATE INDEX IF NOT EXISTS "WorkoutReminder_userId_idx" ON "WorkoutReminder"("userId");

-- Foreign keys
ALTER TABLE "TemplateExercise" DROP CONSTRAINT IF EXISTS "TemplateExercise_templateId_fkey";
ALTER TABLE "TemplateExercise" ADD CONSTRAINT "TemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateExercise" DROP CONSTRAINT IF EXISTS "TemplateExercise_exerciseId_fkey";
ALTER TABLE "TemplateExercise" ADD CONSTRAINT "TemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Goal" DROP CONSTRAINT IF EXISTS "Goal_exerciseId_fkey";
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await pool.query(sql);
    console.log("Migration complete.");
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
