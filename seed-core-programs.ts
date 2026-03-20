/**
 * Core Workout Programs Seed
 *
 * Seeds pre-built classic fitness programs that users can browse and add
 * to their own program list. These use exercises from the standard seed.
 *
 * Run with: npx tsx seed-core-programs.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let prisma!: PrismaClient;

export async function seedCorePrograms(customPrisma: PrismaClient) {
  prisma = customPrisma;
  await main();
}

const SYSTEM_CORE_USER = "SYSTEM_CORE";

async function getExerciseId(name: string): Promise<string> {
  const ex = await prisma.exercise.findUnique({ where: { name } });
  if (!ex) throw new Error(`Exercise not found: "${name}"`);
  return ex.id;
}

async function upsertProgram(
  userId: string,
  data: {
    name: string;
    description: string;
    daysPerWeek: number;
    durationWeeks: number;
    days: {
      dayNumber: number;
      name: string;
      exercises: { name: string; sets: number; reps: string; rest: number; notes?: string }[];
    }[];
  }
) {
  const existing = await prisma.workoutProgram.findFirst({ where: { userId, name: data.name } });
  if (existing) {
    console.log(`  ↩ Skipping (exists): ${data.name}`);
    return;
  }

  const days = await Promise.all(
    data.days.map(async (day) => ({
      dayNumber: day.dayNumber,
      name: day.name,
      exercises: await Promise.all(
        day.exercises.map(async (ex, i) => ({
          exerciseId: await getExerciseId(ex.name),
          order: i + 1,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.rest,
          notes: ex.notes,
        }))
      ),
    }))
  );

  await prisma.workoutProgram.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      daysPerWeek: data.daysPerWeek,
      durationWeeks: data.durationWeeks,
      active: false,
      days: {
        create: days.map((day) => ({
          dayNumber: day.dayNumber,
          name: day.name,
          exercises: { create: day.exercises },
        })),
      },
    },
  });

  console.log(`  ✓ Created: ${data.name}`);
}

async function main() {
  console.log("\nSeeding core programs...\n");

  // =========================================================================
  // 1. PUSH / PULL / LEGS (PPL) — Classic Hypertrophy
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Push / Pull / Legs (PPL)",
    description:
      "The classic 6-day Push/Pull/Legs hypertrophy split. Each muscle group is trained twice per week with high volume. " +
      "Push days target chest, shoulders, and triceps. Pull days target back and biceps. Leg days target quads, hamstrings, glutes, and calves. " +
      "Ideal for intermediate lifters looking to maximize muscle growth. " +
      "LEVEL: Intermediate — requires 6–12 months of consistent training.",
    daysPerWeek: 6,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Push A — Chest & Shoulders Focus",
        exercises: [
          { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: 120, notes: "Primary horizontal push — focus on progressive overload" },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: 90 },
          { name: "Overhead Press", sets: 3, reps: "8-10", rest: 90 },
          { name: "Dumbbell Lateral Raise", sets: 4, reps: "15-20", rest: 60 },
          { name: "Tricep Pushdown", sets: 3, reps: "12-15", rest: 60 },
          { name: "Overhead Tricep Extension", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: "Pull A — Back & Biceps Focus",
        exercises: [
          { name: "Pull-Up", sets: 4, reps: "6-10", rest: 120, notes: "Add weight if bodyweight is easy" },
          { name: "Barbell Row", sets: 4, reps: "6-8", rest: 120 },
          { name: "Seated Cable Row", sets: 3, reps: "10-12", rest: 90 },
          { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: 90 },
          { name: "Barbell Curl", sets: 3, reps: "10-12", rest: 60 },
          { name: "Hammer Curl", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 3,
        name: "Legs A — Quad Focus",
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "6-8", rest: 150, notes: "Primary quad compound — drive knees out" },
          { name: "Leg Press", sets: 3, reps: "10-12", rest: 90 },
          { name: "Leg Extension", sets: 3, reps: "15-20", rest: 60 },
          { name: "Romanian Deadlift", sets: 3, reps: "10-12", rest: 90 },
          { name: "Leg Curl", sets: 3, reps: "12-15", rest: 60 },
          { name: "Standing Calf Raise", sets: 4, reps: "15-20", rest: 60 },
        ],
      },
      {
        dayNumber: 4,
        name: "Push B — Shoulder & Tricep Focus",
        exercises: [
          { name: "Overhead Press", sets: 4, reps: "6-8", rest: 120, notes: "Primary vertical push — brace core" },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: 90 },
          { name: "Dumbbell Flye", sets: 3, reps: "12-15", rest: 75 },
          { name: "Dumbbell Lateral Raise", sets: 4, reps: "15-20", rest: 60 },
          { name: "Arnold Press", sets: 3, reps: "10-12", rest: 75 },
          { name: "Skull Crusher", sets: 3, reps: "10-12", rest: 75 },
          { name: "Tricep Pushdown", sets: 3, reps: "15-20", rest: 60 },
        ],
      },
      {
        dayNumber: 5,
        name: "Pull B — Thickness & Bicep Peak",
        exercises: [
          { name: "Deadlift", sets: 3, reps: "5", rest: 180, notes: "Heavy hinge — brace hard, reset between reps" },
          { name: "Dumbbell Row", sets: 4, reps: "10-12", rest: 90 },
          { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: 90 },
          { name: "Face Pull", sets: 4, reps: "15-20", rest: 60 },
          { name: "Dumbbell Curl", sets: 3, reps: "10-12", rest: 60 },
          { name: "Incline Dumbbell Curl", sets: 3, reps: "12-15", rest: 60 },
          { name: "Cable Curl", sets: 3, reps: "15-20", rest: 60 },
        ],
      },
      {
        dayNumber: 6,
        name: "Legs B — Posterior Chain & Glute Focus",
        exercises: [
          { name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: 120, notes: "Feel the hamstring stretch at the bottom" },
          { name: "Bulgarian Split Squat", sets: 3, reps: "10-12 each", rest: 90 },
          { name: "Hip Thrust", sets: 4, reps: "12-15", rest: 90 },
          { name: "Leg Curl", sets: 4, reps: "12-15", rest: 75 },
          { name: "Leg Press", sets: 3, reps: "15-20", rest: 75, notes: "High foot placement for glute/ham bias" },
          { name: "Seated Calf Raise", sets: 4, reps: "15-20", rest: 60 },
        ],
      },
    ],
  });

  // =========================================================================
  // 2. STARTING STRENGTH (5×5 Style) — Beginner Strength
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Starting Strength (5×5 Style)",
    description:
      "The most proven beginner barbell program. Train 3 days per week with 3 core compound lifts and add weight every session. " +
      "Based on the principles of Mark Rippetoe's Starting Strength — squat every session, focus on linear progression. " +
      "Expect rapid strength gains. Add 5 lbs to upper body lifts and 10 lbs to lower body lifts each session until you stall. " +
      "LEVEL: Beginner — perfect for anyone in their first 6 months of structured lifting.",
    daysPerWeek: 3,
    durationWeeks: 12,
    days: [
      {
        dayNumber: 1,
        name: "Workout A",
        exercises: [
          { name: "Barbell Squat", sets: 3, reps: "5", rest: 180, notes: "Add 10 lbs next session. Focus on depth and bracing." },
          { name: "Barbell Bench Press", sets: 3, reps: "5", rest: 150, notes: "Add 5 lbs next time you do Workout A" },
          { name: "Barbell Row", sets: 3, reps: "5", rest: 150, notes: "Alternate with Overhead Press each week" },
        ],
      },
      {
        dayNumber: 2,
        name: "Workout B",
        exercises: [
          { name: "Barbell Squat", sets: 3, reps: "5", rest: 180, notes: "Add 10 lbs next session — squat every workout" },
          { name: "Overhead Press", sets: 3, reps: "5", rest: 150, notes: "Add 5 lbs next time you do Workout B" },
          { name: "Deadlift", sets: 1, reps: "5", rest: 300, notes: "One heavy work set. Add 10–15 lbs each session." },
        ],
      },
      {
        dayNumber: 3,
        name: "Workout A (repeat)",
        exercises: [
          { name: "Barbell Squat", sets: 3, reps: "5", rest: 180, notes: "Keep adding weight every session — this is the program" },
          { name: "Barbell Bench Press", sets: 3, reps: "5", rest: 150 },
          { name: "Barbell Row", sets: 3, reps: "5", rest: 150 },
        ],
      },
    ],
  });

  // =========================================================================
  // 3. UPPER / LOWER SPLIT — Intermediate Strength & Size
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Upper / Lower Split",
    description:
      "4-day upper/lower split balancing strength work (lower reps) with hypertrophy work (higher reps). " +
      "Each muscle group is trained twice per week with optimal frequency for intermediate lifters. " +
      "Upper days cover chest, back, shoulders, and arms. Lower days cover quads, hamstrings, glutes, and calves. " +
      "LEVEL: Intermediate — great after completing a beginner program.",
    daysPerWeek: 4,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Upper A — Strength Focus",
        exercises: [
          { name: "Barbell Bench Press", sets: 4, reps: "4-6", rest: 150, notes: "Heavy — progress weight each week" },
          { name: "Barbell Row", sets: 4, reps: "4-6", rest: 150 },
          { name: "Overhead Press", sets: 3, reps: "6-8", rest: 120 },
          { name: "Pull-Up", sets: 3, reps: "6-10", rest: 120 },
          { name: "Dumbbell Lateral Raise", sets: 3, reps: "15-20", rest: 60 },
          { name: "Barbell Curl", sets: 2, reps: "10-12", rest: 60 },
          { name: "Tricep Pushdown", sets: 2, reps: "10-12", rest: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: "Lower A — Strength Focus",
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "4-6", rest: 180, notes: "Primary quad movement — heavy sets" },
          { name: "Romanian Deadlift", sets: 3, reps: "8-10", rest: 120 },
          { name: "Leg Press", sets: 3, reps: "10-12", rest: 90 },
          { name: "Leg Curl", sets: 3, reps: "10-12", rest: 90 },
          { name: "Hip Thrust", sets: 3, reps: "12-15", rest: 90 },
          { name: "Standing Calf Raise", sets: 4, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 3,
        name: "Upper B — Hypertrophy Focus",
        exercises: [
          { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", rest: 90 },
          { name: "Lat Pulldown", sets: 4, reps: "10-12", rest: 90 },
          { name: "Arnold Press", sets: 3, reps: "10-12", rest: 90 },
          { name: "Seated Cable Row", sets: 3, reps: "12-15", rest: 75 },
          { name: "Dumbbell Flye", sets: 3, reps: "12-15", rest: 75 },
          { name: "Face Pull", sets: 3, reps: "15-20", rest: 60 },
          { name: "Dumbbell Curl", sets: 3, reps: "12-15", rest: 60 },
          { name: "Skull Crusher", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 4,
        name: "Lower B — Hypertrophy Focus",
        exercises: [
          { name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: 120, notes: "Hamstring stretch at bottom — control the eccentric" },
          { name: "Bulgarian Split Squat", sets: 3, reps: "10-12 each", rest: 90 },
          { name: "Leg Extension", sets: 4, reps: "15-20", rest: 60 },
          { name: "Leg Curl", sets: 4, reps: "12-15", rest: 75 },
          { name: "Hip Thrust", sets: 4, reps: "15-20", rest: 75 },
          { name: "Seated Calf Raise", sets: 4, reps: "15-20", rest: 60 },
        ],
      },
    ],
  });

  // =========================================================================
  // 4. FULL BODY 3×/WEEK — Beginner / General Fitness
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Full Body 3×/Week",
    description:
      "3-day full body program training every major muscle group each session. " +
      "Ideal for beginners, those returning from a break, or anyone with limited gym time. " +
      "Short, efficient sessions covering compound movements. Progressive overload through added reps, then weight. " +
      "LEVEL: Beginner — no prior experience required.",
    daysPerWeek: 3,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Day 1 — Monday",
        exercises: [
          { name: "Barbell Squat", sets: 3, reps: "8-10", rest: 120, notes: "Beginners: use just the bar until form is solid" },
          { name: "Barbell Bench Press", sets: 3, reps: "8-10", rest: 90 },
          { name: "Barbell Row", sets: 3, reps: "8-10", rest: 90 },
          { name: "Overhead Press", sets: 2, reps: "10-12", rest: 90 },
          { name: "Plank", sets: 3, reps: "30-60s", rest: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: "Day 2 — Wednesday",
        exercises: [
          { name: "Deadlift", sets: 3, reps: "5-8", rest: 150, notes: "Focus on keeping your back flat and bracing your core" },
          { name: "Pull-Up", sets: 3, reps: "max (or lat pulldown)", rest: 90 },
          { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: 90 },
          { name: "Dumbbell Lateral Raise", sets: 3, reps: "12-15", rest: 60 },
          { name: "Crunch", sets: 3, reps: "15-20", rest: 45 },
        ],
      },
      {
        dayNumber: 3,
        name: "Day 3 — Friday",
        exercises: [
          { name: "Barbell Squat", sets: 3, reps: "8-10", rest: 120, notes: "Try to add reps or weight from Day 1" },
          { name: "Dumbbell Row", sets: 3, reps: "10-12 each", rest: 90 },
          { name: "Push-Up", sets: 3, reps: "max", rest: 75, notes: "Switch to bench press as you get stronger" },
          { name: "Hip Thrust", sets: 3, reps: "12-15", rest: 90 },
          { name: "Hanging Leg Raise", sets: 3, reps: "10-15", rest: 60 },
        ],
      },
    ],
  });

  // =========================================================================
  // 5. PHUL — Power Hypertrophy Upper Lower
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "PHUL — Power Hypertrophy Upper Lower",
    description:
      "PHUL (Power Hypertrophy Upper Lower) is a 4-day program combining heavy strength work and high-rep hypertrophy work. " +
      "Days 1–2 are power-focused (heavy compounds, 3–5 reps). Days 3–4 are hypertrophy-focused (moderate weight, 8–15 reps). " +
      "Trains each muscle group twice weekly — once for strength, once for size. " +
      "LEVEL: Intermediate — suited for those with 6+ months of consistent training.",
    daysPerWeek: 4,
    durationWeeks: 12,
    days: [
      {
        dayNumber: 1,
        name: "Upper Power",
        exercises: [
          { name: "Barbell Bench Press", sets: 4, reps: "3-5", rest: 180, notes: "Work up to a heavy top set, then back off" },
          { name: "Barbell Row", sets: 4, reps: "3-5", rest: 180 },
          { name: "Overhead Press", sets: 3, reps: "5-8", rest: 120 },
          { name: "Pull-Up", sets: 3, reps: "5-8", rest: 120 },
          { name: "Barbell Curl", sets: 3, reps: "6-10", rest: 75 },
          { name: "Close-Grip Bench Press", sets: 3, reps: "6-10", rest: 75 },
        ],
      },
      {
        dayNumber: 2,
        name: "Lower Power",
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "3-5", rest: 240, notes: "Main strength movement — heavy and technical" },
          { name: "Deadlift", sets: 4, reps: "3-5", rest: 240 },
          { name: "Leg Press", sets: 3, reps: "10-15", rest: 90 },
          { name: "Leg Curl", sets: 3, reps: "10-15", rest: 90 },
          { name: "Standing Calf Raise", sets: 4, reps: "8-12", rest: 75 },
        ],
      },
      {
        dayNumber: 3,
        name: "Upper Hypertrophy",
        exercises: [
          { name: "Incline Dumbbell Press", sets: 4, reps: "10-15", rest: 90 },
          { name: "Cable Crossover", sets: 4, reps: "12-15", rest: 75 },
          { name: "Lat Pulldown", sets: 4, reps: "10-15", rest: 90 },
          { name: "Seated Cable Row", sets: 4, reps: "10-15", rest: 75 },
          { name: "Dumbbell Lateral Raise", sets: 4, reps: "12-15", rest: 60 },
          { name: "Face Pull", sets: 3, reps: "15-20", rest: 60 },
          { name: "Dumbbell Curl", sets: 4, reps: "12-15", rest: 60 },
          { name: "Tricep Pushdown", sets: 4, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 4,
        name: "Lower Hypertrophy",
        exercises: [
          { name: "Front Squat", sets: 4, reps: "10-15", rest: 120, notes: "More quad-focused than back squat" },
          { name: "Bulgarian Split Squat", sets: 3, reps: "10-15 each", rest: 90 },
          { name: "Romanian Deadlift", sets: 4, reps: "10-15", rest: 90 },
          { name: "Leg Extension", sets: 4, reps: "15-20", rest: 60 },
          { name: "Leg Curl", sets: 4, reps: "15-20", rest: 60 },
          { name: "Hip Thrust", sets: 4, reps: "15-20", rest: 75 },
          { name: "Seated Calf Raise", sets: 4, reps: "15-20", rest: 60 },
        ],
      },
    ],
  });

  // =========================================================================
  // 6. ARNOLD SPLIT — Classic 3-Day Bodybuilding
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Arnold Split — Classic Bodybuilding",
    description:
      "The classic 6-day split popularized by Arnold Schwarzenegger. Each muscle group is trained twice per week with high volume. " +
      "Chest and back are trained together, shoulders and arms together, and legs on their own day. " +
      "Known for its chest/back superset approach which creates an incredible pump and saves time. " +
      "LEVEL: Intermediate to Advanced — high volume requires solid recovery.",
    daysPerWeek: 6,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Chest & Back — Day 1",
        exercises: [
          { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest: 90, notes: "Superset with Pull-Up for the classic pump" },
          { name: "Pull-Up", sets: 4, reps: "8-10", rest: 90 },
          { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", rest: 75 },
          { name: "Barbell Row", sets: 4, reps: "10-12", rest: 75 },
          { name: "Dumbbell Flye", sets: 3, reps: "12-15", rest: 60 },
          { name: "Lat Pulldown", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: "Shoulders & Arms — Day 1",
        exercises: [
          { name: "Overhead Press", sets: 4, reps: "8-10", rest: 90 },
          { name: "Arnold Press", sets: 4, reps: "10-12", rest: 75 },
          { name: "Dumbbell Lateral Raise", sets: 4, reps: "12-15", rest: 60 },
          { name: "Barbell Curl", sets: 4, reps: "10-12", rest: 60 },
          { name: "Skull Crusher", sets: 4, reps: "10-12", rest: 60 },
          { name: "Hammer Curl", sets: 3, reps: "12-15", rest: 60 },
          { name: "Tricep Pushdown", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        dayNumber: 3,
        name: "Legs — Day 1",
        exercises: [
          { name: "Barbell Squat", sets: 5, reps: "8-12", rest: 120, notes: "High volume squat day — go for the burn" },
          { name: "Romanian Deadlift", sets: 4, reps: "10-12", rest: 90 },
          { name: "Leg Press", sets: 4, reps: "12-15", rest: 90 },
          { name: "Leg Extension", sets: 3, reps: "15-20", rest: 60 },
          { name: "Leg Curl", sets: 3, reps: "15-20", rest: 60 },
          { name: "Standing Calf Raise", sets: 5, reps: "15-20", rest: 60 },
        ],
      },
      {
        dayNumber: 4,
        name: "Chest & Back — Day 2",
        exercises: [
          { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", rest: 90 },
          { name: "Seated Cable Row", sets: 4, reps: "10-12", rest: 90 },
          { name: "Cable Crossover", sets: 4, reps: "12-15", rest: 60 },
          { name: "Dumbbell Row", sets: 4, reps: "12-15 each", rest: 75 },
          { name: "Push-Up", sets: 3, reps: "max", rest: 60, notes: "Burnout set — go to failure" },
          { name: "Face Pull", sets: 3, reps: "15-20", rest: 60 },
        ],
      },
      {
        dayNumber: 5,
        name: "Shoulders & Arms — Day 2",
        exercises: [
          { name: "Dumbbell Front Raise", sets: 3, reps: "12-15", rest: 60 },
          { name: "Dumbbell Lateral Raise", sets: 4, reps: "15-20", rest: 60 },
          { name: "Face Pull", sets: 3, reps: "15-20", rest: 60 },
          { name: "Dumbbell Curl", sets: 4, reps: "12-15", rest: 60 },
          { name: "Overhead Tricep Extension", sets: 4, reps: "12-15", rest: 60 },
          { name: "Cable Curl", sets: 3, reps: "15-20", rest: 60 },
          { name: "Diamond Push-Up", sets: 3, reps: "max", rest: 60 },
        ],
      },
      {
        dayNumber: 6,
        name: "Legs — Day 2",
        exercises: [
          { name: "Front Squat", sets: 4, reps: "10-12", rest: 120 },
          { name: "Bulgarian Split Squat", sets: 4, reps: "12-15 each", rest: 90 },
          { name: "Hip Thrust", sets: 4, reps: "15-20", rest: 90 },
          { name: "Good Morning", sets: 3, reps: "12-15", rest: 90 },
          { name: "Leg Curl", sets: 4, reps: "15-20", rest: 60 },
          { name: "Seated Calf Raise", sets: 5, reps: "20", rest: 60 },
        ],
      },
    ],
  });

  console.log("\n✅ Core programs seeded successfully.\n");
}

// Run standalone
if (require.main === module) {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  prisma = new PrismaClient({ adapter });
  main().catch(console.error).finally(() => prisma.$disconnect());
}
