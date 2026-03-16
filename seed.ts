import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Workout1!", 12);

  const user = await prisma.workoutUser.upsert({
    where: { email: "me@workout.app" },
    update: {},
    create: { email: "me@workout.app", passwordHash },
  });

  const exercises = [
    { name: "Barbell Bench Press", category: "STRENGTH", muscleGroup: "CHEST", equipment: "BARBELL", instructions: "Primary horizontal push" },
    { name: "Incline Dumbbell Press", category: "STRENGTH", muscleGroup: "CHEST", equipment: "DUMBBELL", instructions: "Upper chest emphasis" },
    { name: "Dumbbell Flye", category: "STRENGTH", muscleGroup: "CHEST", equipment: "DUMBBELL", instructions: "Isolation movement" },
    { name: "Cable Crossover", category: "STRENGTH", muscleGroup: "CHEST", equipment: "CABLE", instructions: "Peak contraction" },
    { name: "Push-Up", category: "BODYWEIGHT", muscleGroup: "CHEST", equipment: "BODYWEIGHT", instructions: "No equipment needed" },
    { name: "Chest Dip", category: "BODYWEIGHT", muscleGroup: "CHEST", equipment: "BODYWEIGHT", instructions: "Lean forward for chest" },
    { name: "Deadlift", category: "STRENGTH", muscleGroup: "BACK", equipment: "BARBELL", instructions: "Posterior chain compound" },
    { name: "Barbell Row", category: "STRENGTH", muscleGroup: "BACK", equipment: "BARBELL", instructions: "Horizontal pull" },
    { name: "Pull-Up", category: "BODYWEIGHT", muscleGroup: "BACK", equipment: "BODYWEIGHT", instructions: "Vertical pull" },
    { name: "Lat Pulldown", category: "STRENGTH", muscleGroup: "BACK", equipment: "CABLE", instructions: "Machine alternative to pull-up" },
    { name: "Seated Cable Row", category: "STRENGTH", muscleGroup: "BACK", equipment: "CABLE", instructions: "Mid-back focus" },
    { name: "Dumbbell Row", category: "STRENGTH", muscleGroup: "BACK", equipment: "DUMBBELL", instructions: "Single arm variation" },
    { name: "Overhead Press", category: "STRENGTH", muscleGroup: "SHOULDERS", equipment: "BARBELL", instructions: "Primary vertical push" },
    { name: "Dumbbell Lateral Raise", category: "STRENGTH", muscleGroup: "SHOULDERS", equipment: "DUMBBELL", instructions: "Side delt isolation" },
    { name: "Dumbbell Front Raise", category: "STRENGTH", muscleGroup: "SHOULDERS", equipment: "DUMBBELL", instructions: "Front delt isolation" },
    { name: "Face Pull", category: "STRENGTH", muscleGroup: "SHOULDERS", equipment: "CABLE", instructions: "Rear delt and rotator cuff" },
    { name: "Arnold Press", category: "STRENGTH", muscleGroup: "SHOULDERS", equipment: "DUMBBELL", instructions: "Full shoulder coverage" },
    { name: "Barbell Curl", category: "STRENGTH", muscleGroup: "BICEPS", equipment: "BARBELL", instructions: "Primary bicep builder" },
    { name: "Dumbbell Curl", category: "STRENGTH", muscleGroup: "BICEPS", equipment: "DUMBBELL", instructions: "Allows pronation/supination" },
    { name: "Hammer Curl", category: "STRENGTH", muscleGroup: "BICEPS", equipment: "DUMBBELL", instructions: "Brachialis emphasis" },
    { name: "Incline Dumbbell Curl", category: "STRENGTH", muscleGroup: "BICEPS", equipment: "DUMBBELL", instructions: "Stretch position" },
    { name: "Cable Curl", category: "STRENGTH", muscleGroup: "BICEPS", equipment: "CABLE", instructions: "Constant tension" },
    { name: "Close-Grip Bench Press", category: "STRENGTH", muscleGroup: "TRICEPS", equipment: "BARBELL", instructions: "Compound tricep movement" },
    { name: "Tricep Pushdown", category: "STRENGTH", muscleGroup: "TRICEPS", equipment: "CABLE", instructions: "Most common isolation" },
    { name: "Overhead Tricep Extension", category: "STRENGTH", muscleGroup: "TRICEPS", equipment: "DUMBBELL", instructions: "Long head stretch" },
    { name: "Skull Crusher", category: "STRENGTH", muscleGroup: "TRICEPS", equipment: "BARBELL", instructions: "EZ-bar or straight bar" },
    { name: "Diamond Push-Up", category: "BODYWEIGHT", muscleGroup: "TRICEPS", equipment: "BODYWEIGHT", instructions: "No equipment needed" },
    { name: "Plank", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Duration-based" },
    { name: "Crunch", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Basic core flexion" },
    { name: "Hanging Leg Raise", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lower abs and hip flexors" },
    { name: "Cable Crunch", category: "STRENGTH", muscleGroup: "CORE", equipment: "CABLE", instructions: "Weighted core flexion" },
    { name: "Ab Wheel Rollout", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "NONE", instructions: "Full core engagement" },
    { name: "Russian Twist", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Rotational core" },
    { name: "Barbell Squat", category: "STRENGTH", muscleGroup: "QUADS", equipment: "BARBELL", instructions: "Primary quad compound" },
    { name: "Front Squat", category: "STRENGTH", muscleGroup: "QUADS", equipment: "BARBELL", instructions: "Quad and core emphasis" },
    { name: "Leg Press", category: "STRENGTH", muscleGroup: "QUADS", equipment: "MACHINE", instructions: "Quad isolation with load" },
    { name: "Leg Extension", category: "STRENGTH", muscleGroup: "QUADS", equipment: "MACHINE", instructions: "Quad isolation" },
    { name: "Bulgarian Split Squat", category: "STRENGTH", muscleGroup: "QUADS", equipment: "DUMBBELL", instructions: "Unilateral quad" },
    { name: "Hack Squat", category: "STRENGTH", muscleGroup: "QUADS", equipment: "MACHINE", instructions: "Quad-focused squat" },
    { name: "Romanian Deadlift", category: "STRENGTH", muscleGroup: "HAMSTRINGS", equipment: "BARBELL", instructions: "Hamstring hinge" },
    { name: "Leg Curl", category: "STRENGTH", muscleGroup: "HAMSTRINGS", equipment: "MACHINE", instructions: "Hamstring isolation" },
    { name: "Hip Thrust", category: "STRENGTH", muscleGroup: "GLUTES", equipment: "BARBELL", instructions: "Primary glute builder" },
    { name: "Glute Bridge", category: "BODYWEIGHT", muscleGroup: "GLUTES", equipment: "BODYWEIGHT", instructions: "Glute activation" },
    { name: "Good Morning", category: "STRENGTH", muscleGroup: "HAMSTRINGS", equipment: "BARBELL", instructions: "Posterior chain" },
    { name: "Cable Kickback", category: "STRENGTH", muscleGroup: "GLUTES", equipment: "CABLE", instructions: "Glute isolation" },
    { name: "Standing Calf Raise", category: "STRENGTH", muscleGroup: "CALVES", equipment: "MACHINE", instructions: "Gastrocnemius focus" },
    { name: "Seated Calf Raise", category: "STRENGTH", muscleGroup: "CALVES", equipment: "MACHINE", instructions: "Soleus focus" },
    { name: "Donkey Calf Raise", category: "BODYWEIGHT", muscleGroup: "CALVES", equipment: "BODYWEIGHT", instructions: "High stretch" },
  ] as const;

  for (const ex of exercises) {
    await prisma.exercise.upsert({ where: { name: ex.name }, update: {}, create: ex });
  }

  console.log("✓ User created");
  console.log("✓ Exercises seeded:", exercises.length);
  console.log("\nLogin:");
  console.log("  Email:    me@workout.app");
  console.log("  Password: Workout1!");
  console.log(`\nUser ID (use this for workout data): ${user.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
