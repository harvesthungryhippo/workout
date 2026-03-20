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

// ---------------------------------------------------------------------------
// Additional core/abs exercises not in the standard seed
// ---------------------------------------------------------------------------
const coreExercises = [
  { name: "Bicycle Crunch", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on back, alternate elbow-to-opposite-knee while extending the other leg. Targets obliques and rectus abdominis." },
  { name: "Leg Raise (Floor)", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie flat, keep legs straight and raise them to 90° then lower slowly. Targets lower abs and hip flexors." },
  { name: "Toe Touch", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on back, legs straight up, crunch up to touch your toes. Upper abs focus." },
  { name: "Dead Bug", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on back, arms up, knees at 90°. Slowly lower opposite arm and leg while pressing lower back into floor. Deep core stability." },
  { name: "V-Up", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie flat, simultaneously raise legs and upper body to form a V shape. Full abs contraction." },
  { name: "Hollow Body Hold", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on back, press lower back to floor, raise legs and shoulders slightly off ground. Sustain position — gymnastics foundation." },
  { name: "Side Plank", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Support on one forearm and foot, body in a straight line. Targets obliques and lateral stabilizers." },
  { name: "Mountain Climber", category: "CARDIO", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "In push-up position, alternate driving knees to chest rapidly. Core stability under dynamic load." },
  { name: "Windshield Wiper", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Hang from a bar or lie on back, rotate legs side to side like a windshield wiper. Heavy oblique and hip flexor demand." },
  { name: "Toes-to-Bar", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Hang from a pull-up bar and raise straight legs to touch the bar. Intense lower abs and hip flexor movement." },
  { name: "Pallof Press", category: "STRENGTH", muscleGroup: "CORE", equipment: "CABLE", instructions: "Stand perpendicular to a cable, press handle straight out and resist rotation. Anti-rotation core stability." },
  { name: "Stability Ball Crunch", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "NONE", instructions: "Lie back on a stability ball, extend over the ball to stretch abs, then crunch up. Greater range of motion than floor crunch." },
  { name: "Dragon Flag", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on bench, grip behind head, raise entire body from neck down and lower slowly. Bruce Lee's signature — intense full-core movement." },
  { name: "L-Sit Hold", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Support on parallel bars or floor, raise legs parallel to ground and hold. Advanced hip flexor and core strength." },
  { name: "Copenhagen Plank", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Side plank with top foot resting on a bench. Elite adductor and lateral core stability." },
] as const;

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
  console.log("\nSeeding core/abs exercises...");
  for (const ex of coreExercises) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
  }
  console.log(`✓ ${coreExercises.length} core exercises seeded`);

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

  // =========================================================================
  // 7. CORE FUNDAMENTALS — Beginner Abs
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Core Fundamentals",
    description:
      "A beginner-friendly 3-day ab program covering all areas of the core: upper abs, lower abs, obliques, and deep stabilizers. " +
      "Short 15–20 minute sessions that can be done standalone or added after any workout. " +
      "Focuses on quality movement and learning to brace — the foundation for every lift. " +
      "LEVEL: Beginner — no equipment needed.",
    daysPerWeek: 3,
    durationWeeks: 4,
    days: [
      {
        dayNumber: 1,
        name: "Day 1 — Upper Abs & Stability",
        exercises: [
          { name: "Dead Bug", sets: 3, reps: "8 each side", rest: 45, notes: "Press your lower back firmly into the floor throughout — quality over speed" },
          { name: "Crunch", sets: 3, reps: "15-20", rest: 45 },
          { name: "Plank", sets: 3, reps: "30-45s", rest: 45, notes: "Brace as if you're about to get punched — no sagging hips" },
          { name: "Toe Touch", sets: 3, reps: "12-15", rest: 45 },
          { name: "Mountain Climber", sets: 3, reps: "20 each leg", rest: 45, notes: "Keep hips level — resist rotation" },
        ],
      },
      {
        dayNumber: 2,
        name: "Day 2 — Lower Abs & Hip Flexors",
        exercises: [
          { name: "Hollow Body Hold", sets: 3, reps: "20-30s", rest: 45, notes: "Lower back must stay pressed into floor — shorten the lever if needed" },
          { name: "Leg Raise (Floor)", sets: 3, reps: "10-15", rest: 45, notes: "Lower slowly — don't let your lower back arch off the floor" },
          { name: "V-Up", sets: 3, reps: "10-12", rest: 45 },
          { name: "Mountain Climber", sets: 3, reps: "20 each leg", rest: 45 },
          { name: "Plank", sets: 2, reps: "30-45s", rest: 45 },
        ],
      },
      {
        dayNumber: 3,
        name: "Day 3 — Obliques & Full Core",
        exercises: [
          { name: "Side Plank", sets: 3, reps: "20-30s each side", rest: 45, notes: "Stack feet or stagger for easier variation" },
          { name: "Bicycle Crunch", sets: 3, reps: "15 each side", rest: 45, notes: "Slow and controlled — feel the oblique contract" },
          { name: "Russian Twist", sets: 3, reps: "15 each side", rest: 45 },
          { name: "Crunch", sets: 3, reps: "15-20", rest: 45 },
          { name: "Dead Bug", sets: 3, reps: "8 each side", rest: 45 },
        ],
      },
    ],
  });

  // =========================================================================
  // 8. SIX PACK BUILDER — Intermediate Abs
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Six Pack Builder",
    description:
      "High-volume 4-day abs program targeting all regions of the core with both bodyweight and weighted movements. " +
      "Progressive overload is applied via added reps, slower tempos, and increasing cable/weighted exercise loads each week. " +
      "Combines upper abs, lower abs, obliques, and anti-rotation work for complete development. " +
      "LEVEL: Intermediate — assumes basic core strength from prior training.",
    daysPerWeek: 4,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Upper Abs — Weighted",
        exercises: [
          { name: "Cable Crunch", sets: 4, reps: "15-20", rest: 60, notes: "Pull through the abs — don't hip hinge. Add weight each week." },
          { name: "Stability Ball Crunch", sets: 3, reps: "15-20", rest: 45, notes: "Extend over the ball to stretch abs fully before each rep" },
          { name: "Toe Touch", sets: 3, reps: "15-20", rest: 45 },
          { name: "Crunch", sets: 3, reps: "20-25", rest: 45, notes: "Slow 2-second hold at the top" },
          { name: "Hollow Body Hold", sets: 3, reps: "30-45s", rest: 45 },
        ],
      },
      {
        dayNumber: 2,
        name: "Lower Abs — Hanging & Floor",
        exercises: [
          { name: "Hanging Leg Raise", sets: 4, reps: "10-15", rest: 60, notes: "Straight legs — don't swing. Posterior pelvic tilt at the top." },
          { name: "Toes-to-Bar", sets: 3, reps: "8-12", rest: 75, notes: "If too hard, do knee raises first, build to straight leg" },
          { name: "Leg Raise (Floor)", sets: 3, reps: "15-20", rest: 45 },
          { name: "V-Up", sets: 3, reps: "12-15", rest: 45 },
          { name: "Mountain Climber", sets: 3, reps: "30 each leg", rest: 45 },
        ],
      },
      {
        dayNumber: 3,
        name: "Obliques — Rotational Power",
        exercises: [
          { name: "Pallof Press", sets: 4, reps: "12 each side", rest: 60, notes: "Stand tall, resist any rotation. Increase cable weight each week." },
          { name: "Windshield Wiper", sets: 3, reps: "10 each side", rest: 60, notes: "Lie on back for easier variation or hang from a bar for advanced" },
          { name: "Bicycle Crunch", sets: 4, reps: "20 each side", rest: 45, notes: "Slow tempo — 2 seconds per rep" },
          { name: "Russian Twist", sets: 4, reps: "15 each side", rest: 45, notes: "Add a plate or medicine ball for resistance" },
          { name: "Side Plank", sets: 3, reps: "30-45s each side", rest: 45 },
        ],
      },
      {
        dayNumber: 4,
        name: "Full Core — Advanced Movements",
        exercises: [
          { name: "Ab Wheel Rollout", sets: 4, reps: "10-15", rest: 60, notes: "From knees until you can do standing rollouts. Control the return." },
          { name: "Dragon Flag", sets: 3, reps: "6-10", rest: 90, notes: "Use a bench. Lower body should be rigid — don't let hips pike" },
          { name: "Dead Bug", sets: 3, reps: "10 each side", rest: 45, notes: "Add a light dumbbell in each hand to increase difficulty" },
          { name: "Hollow Body Hold", sets: 3, reps: "30-60s", rest: 45 },
          { name: "Plank", sets: 3, reps: "45-60s", rest: 45, notes: "Weighted plate on back for added difficulty" },
        ],
      },
    ],
  });

  // =========================================================================
  // 9. ATHLETIC CORE — Functional Stability
  // =========================================================================
  await upsertProgram(SYSTEM_CORE_USER, {
    name: "Athletic Core — Functional Stability",
    description:
      "3-day core program focused on real-world strength and stability rather than aesthetics. " +
      "Trains anti-extension, anti-rotation, lateral stability, and dynamic core control — the same qualities demanded by sport, lifting, and daily movement. " +
      "Great as a standalone program or as a supplement added to any strength program. " +
      "LEVEL: Intermediate — suitable for athletes and lifters wanting functional core strength.",
    daysPerWeek: 3,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Anti-Extension & Bracing",
        exercises: [
          { name: "Ab Wheel Rollout", sets: 4, reps: "8-12", rest: 75, notes: "The gold standard of anti-extension. Hips stay level — no sagging." },
          { name: "Dead Bug", sets: 4, reps: "8 each side", rest: 45, notes: "Slow and deliberate — breathe out as you lower limbs" },
          { name: "Hollow Body Hold", sets: 3, reps: "30-45s", rest: 45 },
          { name: "Plank", sets: 3, reps: "45-60s", rest: 45, notes: "Add shoulder taps to increase difficulty" },
          { name: "Mountain Climber", sets: 3, reps: "20 each leg", rest: 45, notes: "Controlled — no bouncing hips" },
        ],
      },
      {
        dayNumber: 2,
        name: "Anti-Rotation & Lateral Stability",
        exercises: [
          { name: "Pallof Press", sets: 4, reps: "12 each side", rest: 60, notes: "Pause 1 second at full extension. Increase load weekly." },
          { name: "Side Plank", sets: 4, reps: "30-45s each side", rest: 45, notes: "Progress to side plank with hip dip or Copenhagen plank" },
          { name: "Copenhagen Plank", sets: 3, reps: "20-30s each side", rest: 60, notes: "Elite lateral stability — top leg on bench, gap between hip and floor" },
          { name: "Windshield Wiper", sets: 3, reps: "10 each side", rest: 60 },
          { name: "Russian Twist", sets: 3, reps: "12 each side", rest: 45 },
        ],
      },
      {
        dayNumber: 3,
        name: "Dynamic & Integrated Core",
        exercises: [
          { name: "L-Sit Hold", sets: 4, reps: "10-20s", rest: 60, notes: "On parallel bars or floor. Build from tuck L-sit if needed." },
          { name: "Toes-to-Bar", sets: 4, reps: "8-12", rest: 75, notes: "Controlled swing — initiate from core, not momentum" },
          { name: "Dragon Flag", sets: 3, reps: "5-8", rest: 90, notes: "Rigid body from neck to feet — lower as a single unit" },
          { name: "Bicycle Crunch", sets: 3, reps: "15 each side", rest: 45 },
          { name: "Hanging Leg Raise", sets: 3, reps: "10-15", rest: 60, notes: "Straight legs, posterior tilt at the top for full abs contraction" },
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
