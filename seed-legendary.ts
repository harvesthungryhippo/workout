/**
 * Legendary Fighters Workout Programs
 *
 * Seeds workout programs inspired by the documented training regimens of
 * famous martial artists and fitness icons. Each program is attributed to
 * the athlete and rated by difficulty so users can challenge themselves.
 *
 * Run with: npx tsx seed-legendary.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Martial arts & combat sport specific exercises
// ---------------------------------------------------------------------------
const martialArtsExercises = [
  // Cardio / Full Body
  { name: "Jump Rope", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Continuous skipping — warm up at moderate pace, then sprint intervals. Foundation of boxing/MMA conditioning." },
  { name: "Shadow Boxing", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Throw combinations in the air focusing on footwork, head movement, and technique. Used by every combat sports athlete." },
  { name: "Heavy Bag Work", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Strike a heavy bag with full-power punches and kicks. Builds power and conditioning simultaneously." },
  { name: "Speed Bag", category: "CARDIO", muscleGroup: "SHOULDERS", equipment: "NONE", instructions: "Rhythmic striking of a speed bag to develop hand speed, timing, and shoulder endurance." },
  { name: "Focus Mitt Work", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Partner holds pads while you throw combinations. Develops accuracy, timing, and explosive power." },
  { name: "Maize Ball Drill", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "A swinging ball on a cord trains head movement, reflexes, and counter-punching. Ali's signature drill." },
  { name: "Floor-to-Ceiling Ball", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Small bag on elastic cords. Develops hand speed, timing, and rhythm. Used extensively by Muhammad Ali." },
  // Strength / Core
  { name: "Neck Bridge", category: "BODYWEIGHT", muscleGroup: "BACK", equipment: "BODYWEIGHT", instructions: "Lie on your back, push up onto the back of your head and neck, then rock forward and back. Critical for fighters — protects against knockouts. Tyson was famous for these." },
  { name: "Wrestling Bridge", category: "BODYWEIGHT", muscleGroup: "BACK", equipment: "BODYWEIGHT", instructions: "Wrestler's bridge on the crown of the head. Develops neck and spine strength for grappling sports." },
  { name: "Medicine Ball Slam", category: "STRENGTH", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Lift a medicine ball overhead and slam it to the ground with full force. Builds explosive power throughout the kinetic chain." },
  { name: "Medicine Ball Throw", category: "STRENGTH", muscleGroup: "CORE", equipment: "NONE", instructions: "Explosive chest pass or rotational throw against a wall or to a partner. Builds rotational power for punching and kicking." },
  { name: "Knuckle Push-Up", category: "BODYWEIGHT", muscleGroup: "CHEST", equipment: "BODYWEIGHT", instructions: "Push-ups on the knuckles — hardens the hands, builds wrist stability, and engages the chest. Standard in martial arts conditioning." },
  { name: "Fingertip Push-Up", category: "BODYWEIGHT", muscleGroup: "CHEST", equipment: "BODYWEIGHT", instructions: "Push-ups on fingertips only. Develops finger strength and grip — used by Bruce Lee to develop extraordinary grip power." },
  { name: "One-Arm Push-Up", category: "BODYWEIGHT", muscleGroup: "CHEST", equipment: "BODYWEIGHT", instructions: "Push-up performed with a single arm. Extreme shoulder and chest strength — Bruce Lee could do 50 consecutive." },
  { name: "Dragon Flag", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on bench, grip behind head, raise entire body from neck down, lower slowly. Bruce Lee's signature core exercise for functional strength." },
  { name: "Wrist Roller", category: "STRENGTH", muscleGroup: "FOREARMS", equipment: "NONE", instructions: "Wind a weight up on a dowel by rolling the wrists. Builds forearm and grip strength. Bruce Lee had legendary forearms from this." },
  { name: "Reverse Wrist Curl", category: "STRENGTH", muscleGroup: "FOREARMS", equipment: "BARBELL", instructions: "Barbell curl with palms facing down. Develops forearm extensors and grip. Part of Bruce Lee's forearm specialization." },
  { name: "Sit-Up (Full ROM)", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Hands behind head, full range of motion sit-up. Tyson reportedly did 500–2,000 per day during peak training." },
  { name: "Dip (Parallel Bar)", category: "BODYWEIGHT", muscleGroup: "TRICEPS", equipment: "BODYWEIGHT", instructions: "Parallel bar dips for chest and triceps. Tyson did 500+ per day." },
  { name: "Squat Jump", category: "BODYWEIGHT", muscleGroup: "QUADS", equipment: "BODYWEIGHT", instructions: "Lower into a squat and explode upward jumping as high as possible. Builds lower-body power for kicks and movement." },
  { name: "Box Jump", category: "BODYWEIGHT", muscleGroup: "QUADS", equipment: "NONE", instructions: "Explosive jump onto a raised box. Develops lower-body power and fast-twitch muscle activation." },
  { name: "Burpee", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "BODYWEIGHT", instructions: "Drop to push-up, stand, jump with arms overhead. High-intensity full-body conditioning staple in MMA camps." },
  { name: "Bear Crawl", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "BODYWEIGHT", instructions: "Crawl on hands and feet with knees near the floor. Builds shoulder stability, hip flexor strength, and coordination." },
  { name: "Sprawl Drill", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "BODYWEIGHT", instructions: "From standing, sprawl hips back and down with legs shooting back, then recover. Core wrestling defense move and conditioning drill." },
  { name: "Hill Sprint", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Sprint up a steep hill, walk back down. Builds explosive leg power and cardiovascular capacity. Ali and McGregor both used hill running." },
  // Flexibility / Recovery
  { name: "Full Body Stretch", category: "FLEXIBILITY", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "30–60 minute comprehensive stretching routine covering all major muscle groups. Critical for kicking range of motion and injury prevention." },
  { name: "Yoga Flow", category: "FLEXIBILITY", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Dynamic yoga sequence combining strength and flexibility. Used by Conor McGregor and GSP to complement fight training." },
  { name: "Breathing Exercise (Pranayama)", category: "FLEXIBILITY", muscleGroup: "CORE", equipment: "NONE", instructions: "Controlled breathing drills — diaphragmatic breathing, box breathing, and breath holds. Rickson Gracie's foundation for mental and physical control." },
  // Traditional Martial Arts
  { name: "Chi Sao (Sticky Hands)", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Wing Chun sensitivity drill: maintain contact with a partner's arms and react to their movements. Develops reflexes and close-range control." },
  { name: "Wooden Dummy (Mook Yan Jong)", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Strike and trap a wooden training dummy to practice Wing Chun techniques. Develops accuracy, power, and technique." },
  { name: "Forms Practice (Kata/Taolu)", category: "FLEXIBILITY", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Perform martial arts forms/patterns. Develops technique, balance, coordination, and mental focus." },
  { name: "Sprawl and Brawl Combo", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Combination of wrestling defense and standup striking — the hallmark of MMA training." },
  { name: "BJJ Drilling", category: "BODYWEIGHT", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Repetitive practice of Brazilian Jiu-Jitsu techniques: guard passes, sweeps, submissions. Develops muscle memory for ground fighting." },
  { name: "Guard Retention Drill", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Tuck hips, use legs to maintain guard position against a passing opponent. Core BJJ skill drill." },
  { name: "Hip Escape (Shrimp)", category: "BODYWEIGHT", muscleGroup: "CORE", equipment: "BODYWEIGHT", instructions: "Lie on side, push off foot and elbow to scoot hips back. Foundation BJJ movement for escaping bad positions." },
  { name: "Plyometric Push-Up", category: "BODYWEIGHT", muscleGroup: "CHEST", equipment: "BODYWEIGHT", instructions: "Explosive push-up where hands leave the ground at the top. Develops upper body power. Used by Tyson and Lee." },
  { name: "Isometric Horse Stance", category: "BODYWEIGHT", muscleGroup: "QUADS", equipment: "BODYWEIGHT", instructions: "Hold a deep wide-legged squat position. Traditional martial arts exercise for leg strength and endurance." },
  { name: "Side Kick Drill", category: "BODYWEIGHT", muscleGroup: "QUADS", equipment: "BODYWEIGHT", instructions: "Practice side kick mechanics — chamber, extend, retract. Develops hip flexor strength and kicking power." },
  { name: "Round Kick Drill", category: "BODYWEIGHT", muscleGroup: "QUADS", equipment: "BODYWEIGHT", instructions: "Muay Thai / Taekwondo style round kick repetitions. Builds hip rotation power and leg conditioning." },
  { name: "Kettlebell Swing", category: "STRENGTH", muscleGroup: "FULL_BODY", equipment: "KETTLEBELL", instructions: "Hip hinge and explosive hip extension to swing a kettlebell to shoulder height. Builds posterior chain power and cardio — popular in modern MMA conditioning." },
  { name: "Battle Ropes", category: "CARDIO", muscleGroup: "FULL_BODY", equipment: "NONE", instructions: "Wave patterns and slams with heavy ropes. Builds shoulder endurance, grip, and cardiovascular capacity." },
] as const;

// ---------------------------------------------------------------------------
// Helper to get exercise ID by name
// ---------------------------------------------------------------------------
async function getExerciseId(name: string): Promise<string> {
  const ex = await prisma.exercise.findUnique({ where: { name } });
  if (!ex) throw new Error(`Exercise not found: "${name}"`);
  return ex.id;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log("Seeding martial arts exercises...");

  for (const ex of martialArtsExercises) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
  }
  console.log(`✓ ${martialArtsExercises.length} martial arts exercises seeded`);

  // Find the seed user
  const user = await prisma.workoutUser.findUnique({ where: { email: "me@workout.app" } });
  if (!user) {
    console.error("Seed user not found. Run `npm run seed` first.");
    process.exit(1);
  }
  const userId = user.id;

  console.log("\nCreating legendary fighter programs...\n");

  // =========================================================================
  // 1. BRUCE LEE — Jeet Kune Do Conditioning
  // =========================================================================
  // Based on his documented training notes from "The Art of Expressing the
  // Human Body" and training logs. Lee trained 6 days/week combining weights,
  // martial arts, and extraordinary specialization work.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Bruce Lee: Jeet Kune Do Conditioning",
    description:
      "Bruce Lee's documented training program blending weight training, explosive bodyweight work, and martial arts conditioning. " +
      "Lee trained 6 days a week and was famous for his legendary forearm strength (wrist rollers daily), extraordinary core power (Dragon Flags), " +
      "and relentless running. At 135 lbs he could perform two-finger push-ups and one-inch punches powerful enough to knock back men twice his size. " +
      "DIFFICULTY: Advanced — requires solid base fitness. Not for beginners.",
    daysPerWeek: 6,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Monday — Strength & Forearms",
        exercises: [
          { name: "Jump Rope", sets: 3, reps: "5 min", rest: 60, notes: "Warm-up: 5 min continuous, focus on rhythm" },
          { name: "Barbell Bench Press", sets: 4, reps: "8", rest: 90, notes: "Lee used moderate weight for strength, not bodybuilding mass" },
          { name: "Barbell Row", sets: 4, reps: "8", rest: 90 },
          { name: "Clean and Press (use Overhead Press)", sets: 4, reps: "8", rest: 90 },
          { name: "Barbell Curl", sets: 3, reps: "8", rest: 60 },
          { name: "Wrist Roller", sets: 4, reps: "3 rolls up and down", rest: 60, notes: "Lee did these daily — critical for punch power" },
          { name: "Reverse Wrist Curl", sets: 4, reps: "10", rest: 45 },
          { name: "Dragon Flag", sets: 4, reps: "6-10", rest: 90, notes: "Lee's signature exercise — slow and controlled eccentric" },
          { name: "Ab Wheel Rollout", sets: 3, reps: "10-15", rest: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Martial Arts & Cardio",
        exercises: [
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 30, notes: "5 rounds — mix regular and double-unders" },
          { name: "Shadow Boxing", sets: 8, reps: "3 min", rest: 60, notes: "8 rounds: focus on speed, combinations, footwork" },
          { name: "Heavy Bag Work", sets: 5, reps: "3 min", rest: 60, notes: "5 rounds: powerful strikes, all weapons" },
          { name: "Side Kick Drill", sets: 3, reps: "20 each leg", rest: 45, notes: "Lee's side kick was his signature weapon" },
          { name: "One-Arm Push-Up", sets: 3, reps: "10 each arm", rest: 60, notes: "Work up to this gradually — Lee did 50 consecutive" },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0, notes: "Lee stretched extensively — key to his kicking flexibility" },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Legs & Core",
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "8", rest: 90 },
          { name: "Romanian Deadlift", sets: 4, reps: "8", rest: 90 },
          { name: "Squat Jump", sets: 4, reps: "10", rest: 60, notes: "Explosive — builds leg power for kicks" },
          { name: "Isometric Horse Stance", sets: 3, reps: "60 sec hold", rest: 60, notes: "Traditional kung fu leg conditioning" },
          { name: "Dragon Flag", sets: 4, reps: "8-10", rest: 90, notes: "Lee trained core every day" },
          { name: "Hanging Leg Raise", sets: 4, reps: "15-20", rest: 60 },
          { name: "Russian Twist", sets: 3, reps: "20", rest: 45 },
          { name: "Wrist Roller", sets: 4, reps: "3 rolls", rest: 60 },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Martial Arts & Speed",
        exercises: [
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 30 },
          { name: "Shadow Boxing", sets: 6, reps: "3 min", rest: 60, notes: "Focus on speed — Lee valued speed above all" },
          { name: "Speed Bag", sets: 5, reps: "3 min", rest: 45 },
          { name: "Maize Ball Drill", sets: 5, reps: "3 min", rest: 45, notes: "Develop head movement and reflexes" },
          { name: "Round Kick Drill", sets: 3, reps: "20 each leg", rest: 45 },
          { name: "Fingertip Push-Up", sets: 4, reps: "10-20", rest: 60, notes: "Start on knuckles if fingertips are too difficult" },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Strength & Power",
        exercises: [
          { name: "Deadlift", sets: 4, reps: "5", rest: 120, notes: "Heavy compound lift for total body strength" },
          { name: "Overhead Press", sets: 4, reps: "8", rest: 90 },
          { name: "Dumbbell Row", sets: 4, reps: "10", rest: 90 },
          { name: "Plyometric Push-Up", sets: 4, reps: "8-10", rest: 90, notes: "Explosive — maximum speed off the ground" },
          { name: "Medicine Ball Slam", sets: 4, reps: "10", rest: 60 },
          { name: "Dragon Flag", sets: 4, reps: "8-10", rest: 90 },
          { name: "Wrist Roller", sets: 4, reps: "3 rolls", rest: 60 },
          { name: "Reverse Wrist Curl", sets: 4, reps: "12", rest: 45 },
        ],
      },
      {
        dayNumber: 6,
        name: "Saturday — Endurance Run & Flexibility",
        exercises: [
          { name: "Hill Sprint", sets: 10, reps: "30 sec sprint", rest: 90, notes: "Lee ran 4-6 miles daily — this captures the intense interval portion" },
          { name: "Shadow Boxing", sets: 4, reps: "3 min", rest: 60, notes: "Active recovery pace — light technique work" },
          { name: "Full Body Stretch", sets: 1, reps: "45 min", rest: 0, notes: "Comprehensive flexibility — Lee could do full splits" },
          { name: "Breathing Exercise (Pranayama)", sets: 3, reps: "10 min", rest: 0, notes: "Mental focus and recovery breathing" },
        ],
      },
    ],
  });
  console.log("  ✓ Bruce Lee: Jeet Kune Do Conditioning");

  // =========================================================================
  // 2. MIKE TYSON — Iron Mike's Peak Conditioning
  // =========================================================================
  // Documented regimen from Tyson's autobiography and trainer Cus D'Amato's
  // notes. Tyson woke at 4am for a 6-mile run, returned to sleep, then trained
  // noon until evening. Famous for 200 sit-ups, 50 dips, 50 push-ups between
  // rounds as "punishment." Neck bridges were his foundational exercise.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Mike Tyson: Iron Mike's Peak Conditioning",
    description:
      "Mike Tyson's legendary training program under Cus D'Amato. Tyson was arguably the most physically terrifying boxer in history — explosive speed " +
      "combined with KO power. His 4am runs, 200 sit-ups between every exercise, 500 dips per day, and extensive neck bridging made him nearly impossible " +
      "to hurt. This is a 7-day program — rest is a foreign concept to Iron Mike. " +
      "DIFFICULTY: Elite — this program is not safe for untrained individuals.",
    daysPerWeek: 7,
    durationWeeks: 12,
    days: [
      {
        dayNumber: 1,
        name: "Monday — 4am Run + Noon Boxing",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles (1 easy, 4 tempo, 1 sprint intervals)", rest: 0, notes: "4am. Tyson ran 6 miles every single morning. This is non-negotiable." },
          { name: "Neck Bridge", sets: 5, reps: "30-60 sec hold", rest: 60, notes: "NOON. Tyson's most important exercise — a strong neck prevents knockouts. Work up slowly." },
          { name: "Wrestling Bridge", sets: 3, reps: "30 sec hold", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 10, reps: "20", rest: 30, notes: "200 sit-ups in sets of 20. Tyson reportedly did 500-2,000 per day" },
          { name: "Dip (Parallel Bar)", sets: 10, reps: "10", rest: 30, notes: "100 dips — Tyson did 500/day. Scale as needed." },
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 60, notes: "10 rounds — constant rhythm" },
          { name: "Shadow Boxing", sets: 10, reps: "3 min", rest: 60, notes: "10 rounds Peekaboo style — constant head movement" },
          { name: "Heavy Bag Work", sets: 10, reps: "3 min", rest: 60, notes: "10 rounds — explosive combinations, hooks to the body" },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Speed Work",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "4am run" },
          { name: "Neck Bridge", sets: 5, reps: "60 sec", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 10, reps: "20", rest: 30 },
          { name: "Push-Up", sets: 10, reps: "10", rest: 30, notes: "100 push-ups — Tyson did 500/day" },
          { name: "Speed Bag", sets: 10, reps: "3 min", rest: 45, notes: "10 rounds — fast rhythm, shoulder endurance" },
          { name: "Shadow Boxing", sets: 10, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 8, reps: "3 min", rest: 60, notes: "8 rounds with trainer — explosive combinations" },
          { name: "Maize Ball Drill", sets: 5, reps: "3 min", rest: 45, notes: "Head movement and reflexes" },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Sparring Day",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "4am run" },
          { name: "Neck Bridge", sets: 5, reps: "60 sec", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 10, reps: "20", rest: 30 },
          { name: "Dip (Parallel Bar)", sets: 10, reps: "10", rest: 30 },
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 60, notes: "Warm-up for sparring" },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60, notes: "Technical warm-up" },
          { name: "Heavy Bag Work", sets: 6, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 6, reps: "3 min", rest: 60 },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Power Conditioning",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "4am run" },
          { name: "Neck Bridge", sets: 5, reps: "60 sec", rest: 60 },
          { name: "Wrestling Bridge", sets: 3, reps: "30 sec", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 10, reps: "20", rest: 30 },
          { name: "Plyometric Push-Up", sets: 8, reps: "10", rest: 45 },
          { name: "Medicine Ball Throw", sets: 5, reps: "10", rest: 60, notes: "Rotational power for punching" },
          { name: "Medicine Ball Slam", sets: 5, reps: "10", rest: 60 },
          { name: "Heavy Bag Work", sets: 10, reps: "3 min", rest: 60, notes: "Full power — imagine you have 10 seconds to KO your opponent" },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Technical Boxing",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "4am run" },
          { name: "Neck Bridge", sets: 5, reps: "60 sec", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 10, reps: "20", rest: 30 },
          { name: "Dip (Parallel Bar)", sets: 10, reps: "10", rest: 30 },
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 60 },
          { name: "Shadow Boxing", sets: 8, reps: "3 min", rest: 60, notes: "Focus on Peekaboo defense and slipping punches" },
          { name: "Speed Bag", sets: 8, reps: "3 min", rest: 45 },
          { name: "Floor-to-Ceiling Ball", sets: 5, reps: "3 min", rest: 45 },
        ],
      },
      {
        dayNumber: 6,
        name: "Saturday — Full Training Day",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "4am run" },
          { name: "Neck Bridge", sets: 5, reps: "60 sec", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 10, reps: "20", rest: 30 },
          { name: "Push-Up", sets: 10, reps: "10", rest: 30 },
          { name: "Dip (Parallel Bar)", sets: 10, reps: "10", rest: 30 },
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 60 },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60 },
          { name: "Heavy Bag Work", sets: 10, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 5, reps: "3 min", rest: 60 },
        ],
      },
      {
        dayNumber: 7,
        name: "Sunday — Active Recovery",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "4 miles easy", rest: 0, notes: "Even on rest days, Tyson ran. This is light — just 4 easy miles." },
          { name: "Neck Bridge", sets: 3, reps: "60 sec", rest: 60, notes: "Always bridge. Every day." },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30, notes: "Half the usual volume" },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
    ],
  });
  console.log("  ✓ Mike Tyson: Iron Mike's Peak Conditioning");

  // =========================================================================
  // 3. MUHAMMAD ALI — The Greatest's Training Program
  // =========================================================================
  // Ali trained 6 days/week. Famous for his 6am roadwork (6 miles), Ali Shuffle
  // footwork, and extraordinary hand speed. His trainer Angelo Dundee noted
  // his dedication to the floor-to-ceiling ball and jump rope.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Muhammad Ali: Float Like a Butterfly",
    description:
      "Muhammad Ali's training program — arguably the greatest boxer of all time. Ali combined extraordinary athleticism with ring intelligence. " +
      "His 6am 6-mile runs, famous Ali Shuffle, floor-to-ceiling ball for timing, and 15-round sparring sessions built an athlete who could move like a lightweight " +
      "and hit like a heavyweight. 'I hated every minute of training, but I said: Don't quit. Suffer now and live the rest of your life as a champion.' " +
      "DIFFICULTY: Advanced.",
    daysPerWeek: 6,
    durationWeeks: 10,
    days: [
      {
        dayNumber: 1,
        name: "Monday — Roadwork & Boxing",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles (jog 5, sprint last mile)", rest: 0, notes: "6am. Ali was famous for his morning runs in work boots." },
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 60, notes: "Noon. Ali's jump rope was poetry — he used it to develop rhythm and footwork" },
          { name: "Shadow Boxing", sets: 8, reps: "3 min", rest: 60, notes: "Ali Shuffle drill — back and forth rapid footwork while throwing jabs" },
          { name: "Floor-to-Ceiling Ball", sets: 8, reps: "3 min", rest: 45, notes: "Ali's signature drill — developed his legendary hand speed and timing" },
          { name: "Heavy Bag Work", sets: 8, reps: "3 min", rest: 60, notes: "Combination work — jab, cross, hook, jab, jab, step away" },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Speed & Technical Work",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "6am roadwork" },
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 60 },
          { name: "Speed Bag", sets: 10, reps: "3 min", rest: 45, notes: "Ali kept impeccable rhythm — both hands in a continuous pattern" },
          { name: "Maize Ball Drill", sets: 8, reps: "3 min", rest: 45, notes: "Head movement drill — weave and slip" },
          { name: "Shadow Boxing", sets: 6, reps: "3 min", rest: 60, notes: "Focus on the jab — Ali's jab was his greatest weapon" },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30 },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Sparring Day",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "6am roadwork" },
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 60, notes: "Warm-up for sparring" },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60, notes: "Technical warm-up" },
          { name: "Heavy Bag Work", sets: 5, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 10, reps: "3 min", rest: 60, notes: "10 rounds with Angelo Dundee on mitts" },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Footwork & Conditioning",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "6am roadwork" },
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 60, notes: "Focus on Ali Shuffle — bounce side to side while skipping" },
          { name: "Shadow Boxing", sets: 10, reps: "3 min", rest: 60, notes: "Pure footwork rounds — move, angle, don't stand still" },
          { name: "Floor-to-Ceiling Ball", sets: 10, reps: "3 min", rest: 45 },
          { name: "Burpee", sets: 5, reps: "10", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Power & Bag Work",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "6 miles", rest: 0, notes: "6am roadwork" },
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 60 },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60 },
          { name: "Heavy Bag Work", sets: 12, reps: "3 min", rest: 60, notes: "12 rounds — Ali would throw 6-punch combinations then move away" },
          { name: "Speed Bag", sets: 6, reps: "3 min", rest: 45 },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 6,
        name: "Saturday — Long Conditioning Day",
        exercises: [
          { name: "Hill Sprint", sets: 1, reps: "8 miles", rest: 0, notes: "Extra long Saturday run" },
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 60 },
          { name: "Shadow Boxing", sets: 8, reps: "3 min", rest: 60 },
          { name: "Heavy Bag Work", sets: 8, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 6, reps: "3 min", rest: 60 },
          { name: "Sit-Up (Full ROM)", sets: 5, reps: "20", rest: 30 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
    ],
  });
  console.log("  ✓ Muhammad Ali: Float Like a Butterfly");

  // =========================================================================
  // 4. MIKE TYSON JR. — Georges St-Pierre: The Rush
  // Actually GSP — documented from his book and training footage
  // =========================================================================
  await upsertProgram(userId, {
    name: "Georges St-Pierre (GSP): The Rush",
    description:
      "Georges St-Pierre's MMA championship training program. GSP is widely regarded as the most well-rounded MMA fighter ever — Olympic-level wrestling, " +
      "world-class Muay Thai, and black belt BJJ. His training was scientific and innovative, incorporating plyometrics, gymnastics, and movement drills " +
      "alongside traditional MMA work. He trained twice daily during camp. " +
      "'I don't believe in taking shortcuts. The path to greatness is through hard work.' " +
      "DIFFICULTY: Elite — professional MMA training volume.",
    daysPerWeek: 6,
    durationWeeks: 10,
    days: [
      {
        dayNumber: 1,
        name: "Monday — AM: Strength / PM: Wrestling",
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "5", rest: 180, notes: "AM session. Heavy compound work for functional strength." },
          { name: "Deadlift", sets: 4, reps: "5", rest: 180 },
          { name: "Overhead Press", sets: 4, reps: "5", rest: 120 },
          { name: "Plyometric Push-Up", sets: 4, reps: "8", rest: 90 },
          { name: "Box Jump", sets: 4, reps: "8", rest: 90, notes: "Explosive lower body power" },
          { name: "Sprawl Drill", sets: 5, reps: "20", rest: 45, notes: "PM session. Core wrestling defense." },
          { name: "BJJ Drilling", sets: 6, reps: "5 min", rest: 60, notes: "Wrestling and takedown drilling" },
          { name: "Burpee", sets: 5, reps: "10", rest: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — AM: Muay Thai / PM: BJJ",
        exercises: [
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 45, notes: "AM session warm-up" },
          { name: "Shadow Boxing", sets: 6, reps: "3 min", rest: 60, notes: "Muay Thai combinations — punches, kicks, elbows, knees" },
          { name: "Heavy Bag Work", sets: 8, reps: "3 min", rest: 60, notes: "Full Muay Thai — all 8 limbs" },
          { name: "Focus Mitt Work", sets: 8, reps: "3 min", rest: 60 },
          { name: "Round Kick Drill", sets: 4, reps: "20 each leg", rest: 45, notes: "GSP's roundhouse kicks were devastating" },
          { name: "BJJ Drilling", sets: 6, reps: "5 min", rest: 60, notes: "PM session. Guard passes and takedown defense." },
          { name: "Guard Retention Drill", sets: 5, reps: "3 min", rest: 45 },
          { name: "Hip Escape (Shrimp)", sets: 4, reps: "20 each direction", rest: 30 },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Active Recovery & Gymnastics",
        exercises: [
          { name: "Yoga Flow", sets: 1, reps: "60 min", rest: 0, notes: "GSP was one of the first MMA fighters to publicly use yoga as a training tool" },
          { name: "Swimming", sets: 1, reps: "45 min", rest: 0, notes: "Low-impact cardio for active recovery — replace with light bike ride if needed" },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
          { name: "Bear Crawl", sets: 4, reps: "30 meters", rest: 60, notes: "Gymnastics conditioning for movement quality" },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — AM: Sparring / PM: Strength",
        exercises: [
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 45, notes: "AM session warm-up" },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 10, reps: "3 min", rest: 60, notes: "10 rounds of mixed MMA striking" },
          { name: "Sprawl Drill", sets: 5, reps: "20", rest: 45 },
          { name: "Barbell Row", sets: 4, reps: "8", rest: 90, notes: "PM strength session" },
          { name: "Pull-Up", sets: 4, reps: "10-15", rest: 90 },
          { name: "Kettlebell Swing", sets: 4, reps: "20", rest: 60, notes: "Power endurance for wrestling" },
          { name: "Medicine Ball Slam", sets: 4, reps: "10", rest: 60 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Full MMA Training",
        exercises: [
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 45 },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60 },
          { name: "Heavy Bag Work", sets: 5, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 8, reps: "3 min", rest: 60 },
          { name: "Sprawl and Brawl Combo", sets: 6, reps: "5 min", rest: 90, notes: "Full MMA simulation — clinch, takedown attempt, defend, strike" },
          { name: "BJJ Drilling", sets: 4, reps: "5 min", rest: 60 },
          { name: "Burpee", sets: 5, reps: "10", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 6,
        name: "Saturday — Conditioning & Cardio",
        exercises: [
          { name: "Hill Sprint", sets: 8, reps: "45 sec sprint", rest: 90, notes: "GSP ran hills and stadium stairs" },
          { name: "Battle Ropes", sets: 5, reps: "30 sec", rest: 60, notes: "Shoulder endurance for clinch work" },
          { name: "Kettlebell Swing", sets: 5, reps: "20", rest: 60 },
          { name: "Box Jump", sets: 5, reps: "8", rest: 90 },
          { name: "Burpee", sets: 5, reps: "15", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
    ],
  });
  console.log("  ✓ GSP: The Rush");

  // =========================================================================
  // 5. CONOR McGREGOR — Notorious Movement Training
  // =========================================================================
  // McGregor's training is based on movement — he studied Ido Portal's
  // movement methodology alongside traditional MMA training. Known for
  // southpaw precision striking, sharp movement, and mental toughness.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Conor McGregor: The Notorious Movement",
    description:
      "Conor McGregor's pre-fight training camp program blending precision striking, Ido Portal movement training, and high-intensity conditioning. " +
      "McGregor's left hand is one of the most precise KO punches in MMA history — developed through thousands of repetitions of technique. " +
      "His collaboration with movement coach Ido Portal brought unconventional methods to MMA: animal movements, joint mobility, and fluid motion. " +
      "'There's no talent here, this is hard work.' " +
      "DIFFICULTY: Advanced.",
    daysPerWeek: 5,
    durationWeeks: 12,
    days: [
      {
        dayNumber: 1,
        name: "Monday — Movement & Striking",
        exercises: [
          { name: "Bear Crawl", sets: 4, reps: "20 meters", rest: 45, notes: "Ido Portal movement warm-up" },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0, notes: "McGregor dedicated significant time to mobility work" },
          { name: "Shadow Boxing", sets: 8, reps: "3 min", rest: 60, notes: "Southpaw movement — precision and angles" },
          { name: "Heavy Bag Work", sets: 8, reps: "3 min", rest: 60, notes: "Left hand KO shot practice in combinations" },
          { name: "Focus Mitt Work", sets: 10, reps: "3 min", rest: 60, notes: "Counter-striking and precision" },
          { name: "Yoga Flow", sets: 1, reps: "30 min", rest: 0, notes: "Post-training mobility — McGregor was notably flexible" },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Strength & Explosive Power",
        exercises: [
          { name: "Barbell Squat", sets: 4, reps: "6", rest: 180 },
          { name: "Deadlift", sets: 4, reps: "5", rest: 180 },
          { name: "Barbell Bench Press", sets: 4, reps: "6", rest: 120 },
          { name: "Pull-Up", sets: 4, reps: "10-12", rest: 90 },
          { name: "Kettlebell Swing", sets: 5, reps: "20", rest: 60 },
          { name: "Medicine Ball Slam", sets: 5, reps: "10", rest: 60 },
          { name: "Box Jump", sets: 4, reps: "8", rest: 90, notes: "Explosive lower-body power for forward pressure and distance management" },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — MMA & Grappling",
        exercises: [
          { name: "Bear Crawl", sets: 3, reps: "20 meters", rest: 45 },
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 45 },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60 },
          { name: "Sprawl Drill", sets: 5, reps: "20", rest: 45, notes: "McGregor improved his takedown defense significantly" },
          { name: "BJJ Drilling", sets: 6, reps: "5 min", rest: 60 },
          { name: "Sprawl and Brawl Combo", sets: 6, reps: "5 min", rest: 90, notes: "Takedown defense into counter-striking" },
          { name: "Hip Escape (Shrimp)", sets: 4, reps: "20", rest: 30 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Explosive Conditioning",
        exercises: [
          { name: "Hill Sprint", sets: 10, reps: "30 sec sprint", rest: 90, notes: "McGregor ran Dublin mountains for conditioning" },
          { name: "Burpee", sets: 5, reps: "15", rest: 60 },
          { name: "Battle Ropes", sets: 5, reps: "30 sec", rest: 60 },
          { name: "Kettlebell Swing", sets: 5, reps: "20", rest: 60 },
          { name: "Box Jump", sets: 5, reps: "8", rest: 90 },
          { name: "Bear Crawl", sets: 5, reps: "20 meters", rest: 45 },
          { name: "Yoga Flow", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Full Fight Camp",
        exercises: [
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 45 },
          { name: "Shadow Boxing", sets: 5, reps: "3 min", rest: 60 },
          { name: "Heavy Bag Work", sets: 8, reps: "3 min", rest: 60 },
          { name: "Focus Mitt Work", sets: 10, reps: "3 min", rest: 60, notes: "Full camp simulation — work your A-game" },
          { name: "Sprawl Drill", sets: 4, reps: "20", rest: 45 },
          { name: "Burpee", sets: 5, reps: "15", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
    ],
  });
  console.log("  ✓ Conor McGregor: The Notorious Movement");

  // =========================================================================
  // 6. RICKSON GRACIE — BJJ Mastery Program
  // =========================================================================
  // Rickson is considered by many the greatest BJJ practitioner ever —
  // allegedly 400+ wins and 0 losses. His training philosophy combined
  // technical mastery with yoga, breathing control (from Hélio Soneca method),
  // and ocean swimming.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Rickson Gracie: BJJ Mastery",
    description:
      "Rickson Gracie's legendary grappling and conditioning program. Considered by many the greatest BJJ practitioner who ever lived with an alleged " +
      "400+ fight undefeated record. Rickson's training combined technical BJJ drilling, yoga, ocean swimming, and his signature breathing exercises. " +
      "He famously said the most important thing was not technique but the 'invisible jiu-jitsu' — sensitivity, flow, and presence. " +
      "DIFFICULTY: Intermediate to Advanced.",
    daysPerWeek: 6,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Monday — BJJ Technical Drilling",
        exercises: [
          { name: "Breathing Exercise (Pranayama)", sets: 1, reps: "20 min", rest: 0, notes: "Rickson's morning breathing ritual — diaphragmatic breath, holds, and release. His foundational practice." },
          { name: "Yoga Flow", sets: 1, reps: "30 min", rest: 0, notes: "Rickson studied yoga for flexibility and body awareness" },
          { name: "Hip Escape (Shrimp)", sets: 5, reps: "20 each direction", rest: 30, notes: "Foundation BJJ drill — do these every single day" },
          { name: "Guard Retention Drill", sets: 5, reps: "5 min", rest: 45 },
          { name: "BJJ Drilling", sets: 8, reps: "5 min", rest: 60, notes: "Technical drilling: mount escapes, guard passes, submissions" },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Strength & Conditioning",
        exercises: [
          { name: "Breathing Exercise (Pranayama)", sets: 1, reps: "15 min", rest: 0, notes: "Morning breathwork" },
          { name: "Pull-Up", sets: 5, reps: "10-15", rest: 90, notes: "Grip and pulling strength critical for BJJ" },
          { name: "Hanging Leg Raise", sets: 4, reps: "15-20", rest: 60, notes: "Core for guard play" },
          { name: "Barbell Row", sets: 4, reps: "8", rest: 90, notes: "Back strength for takedowns and clinch" },
          { name: "Deadlift", sets: 4, reps: "5", rest: 180, notes: "Hip power for guard passes and takedowns" },
          { name: "Ab Wheel Rollout", sets: 4, reps: "10-15", rest: 60 },
          { name: "Burpee", sets: 5, reps: "10", rest: 60 },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Live Rolling & Flow",
        exercises: [
          { name: "Breathing Exercise (Pranayama)", sets: 1, reps: "20 min", rest: 0, notes: "Prepare the mind and body for rolling" },
          { name: "Hip Escape (Shrimp)", sets: 4, reps: "20", rest: 30, notes: "Warm-up movement" },
          { name: "Bear Crawl", sets: 4, reps: "20 meters", rest: 45, notes: "Movement warm-up" },
          { name: "BJJ Drilling", sets: 5, reps: "5 min", rest: 45, notes: "Specific positional drilling before rolling" },
          { name: "Guard Retention Drill", sets: 6, reps: "5 min", rest: 60, notes: "Live rolling — flow rolling to start, technical rolling to finish" },
          { name: "Yoga Flow", sets: 1, reps: "30 min", rest: 0, notes: "Post-rolling recovery" },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Ocean Swimming & Mobility",
        exercises: [
          { name: "Breathing Exercise (Pranayama)", sets: 1, reps: "20 min", rest: 0, notes: "Rickson swam in the ocean daily in Brazil — replace with pool or sustained cardio" },
          { name: "Burpee", sets: 8, reps: "10", rest: 60, notes: "Open water cardio simulation if no ocean available" },
          { name: "Full Body Stretch", sets: 1, reps: "45 min", rest: 0, notes: "Long flexibility session — Rickson was extremely flexible for his size" },
          { name: "Hip Escape (Shrimp)", sets: 3, reps: "20", rest: 30 },
          { name: "Yoga Flow", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Intense BJJ & Submission Work",
        exercises: [
          { name: "Breathing Exercise (Pranayama)", sets: 1, reps: "15 min", rest: 0 },
          { name: "Hip Escape (Shrimp)", sets: 5, reps: "20", rest: 30 },
          { name: "Guard Retention Drill", sets: 5, reps: "5 min", rest: 45 },
          { name: "BJJ Drilling", sets: 10, reps: "5 min", rest: 60, notes: "High volume technical drilling: armbars, triangles, chokes" },
          { name: "Hanging Leg Raise", sets: 4, reps: "20", rest: 60 },
          { name: "Ab Wheel Rollout", sets: 4, reps: "12", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 6,
        name: "Saturday — Long Endurance & Reflection",
        exercises: [
          { name: "Breathing Exercise (Pranayama)", sets: 1, reps: "30 min", rest: 0, notes: "Extended session — connect with the invisible jiu-jitsu" },
          { name: "Yoga Flow", sets: 1, reps: "60 min", rest: 0, notes: "Full yoga practice" },
          { name: "Hip Escape (Shrimp)", sets: 5, reps: "20", rest: 30 },
          { name: "BJJ Drilling", sets: 4, reps: "5 min", rest: 60, notes: "Light technical review" },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
    ],
  });
  console.log("  ✓ Rickson Gracie: BJJ Mastery");

  // =========================================================================
  // 7. JACKIE CHAN — Stuntman Conditioning
  // =========================================================================
  // Jackie Chan trained at the China Drama Academy from age 6 — 19 hour days
  // of acrobatics, martial arts, and performance. His fitness was built
  // through functional movement, acrobatics, and incredible stunt work.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Jackie Chan: Stuntman Conditioning",
    description:
      "Jackie Chan's functional fitness and martial arts conditioning program. Chan trained at Sifu Yu Jim-yuen's China Drama Academy from age 6 — " +
      "19 hours per day of acrobatics, Peking Opera acrobatics, various martial arts styles, and performance conditioning. " +
      "His fitness is defined by extraordinary body control, flexibility, and functional movement. He performed nearly all his own stunts throughout his career. " +
      "DIFFICULTY: Intermediate.",
    daysPerWeek: 6,
    durationWeeks: 8,
    days: [
      {
        dayNumber: 1,
        name: "Monday — Acrobatics & Kung Fu",
        exercises: [
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0, notes: "Chan could do full splits in all directions — start this journey here" },
          { name: "Forms Practice (Kata/Taolu)", sets: 5, reps: "3 min per form", rest: 60, notes: "Hapkido, Wushu, and opera acrobatics forms" },
          { name: "Isometric Horse Stance", sets: 5, reps: "2-3 min hold", rest: 60, notes: "Foundation stance for all kung fu styles" },
          { name: "Round Kick Drill", sets: 4, reps: "20 each leg", rest: 45 },
          { name: "Side Kick Drill", sets: 4, reps: "20 each leg", rest: 45 },
          { name: "Knuckle Push-Up", sets: 5, reps: "20-30", rest: 60 },
          { name: "Jump Rope", sets: 5, reps: "3 min", rest: 45, notes: "Footwork and coordination" },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Stunt Conditioning",
        exercises: [
          { name: "Bear Crawl", sets: 5, reps: "20 meters", rest: 45, notes: "Body control — stuntmen need to move in all directions" },
          { name: "Squat Jump", sets: 5, reps: "10", rest: 60, notes: "Explosive jumps for parkour-style movement" },
          { name: "Box Jump", sets: 5, reps: "8", rest: 90 },
          { name: "Burpee", sets: 5, reps: "15", rest: 60 },
          { name: "Pull-Up", sets: 5, reps: "10-15", rest: 90, notes: "Hanging and climbing strength for stunts" },
          { name: "Hanging Leg Raise", sets: 4, reps: "15", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Fighting Styles",
        exercises: [
          { name: "Shadow Boxing", sets: 6, reps: "3 min", rest: 60, notes: "Chan blends Hapkido, Taekwondo, Karate, and creative improvisation" },
          { name: "Heavy Bag Work", sets: 6, reps: "3 min", rest: 60, notes: "Kicks, punches, elbows — Chan is known for creative weapon use" },
          { name: "Round Kick Drill", sets: 5, reps: "20 each leg", rest: 45 },
          { name: "Focus Mitt Work", sets: 6, reps: "3 min", rest: 60 },
          { name: "Forms Practice (Kata/Taolu)", sets: 4, reps: "3 min", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Strength & Resilience",
        exercises: [
          { name: "Deadlift", sets: 4, reps: "6", rest: 120 },
          { name: "Pull-Up", sets: 4, reps: "max", rest: 90 },
          { name: "Barbell Row", sets: 4, reps: "8", rest: 90 },
          { name: "Knuckle Push-Up", sets: 5, reps: "20", rest: 60 },
          { name: "Medicine Ball Slam", sets: 4, reps: "10", rest: 60 },
          { name: "Isometric Horse Stance", sets: 5, reps: "2 min", rest: 60 },
          { name: "Hanging Leg Raise", sets: 4, reps: "15", rest: 60 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Cardio & Coordination",
        exercises: [
          { name: "Jump Rope", sets: 10, reps: "3 min", rest: 45, notes: "Peking Opera training: coordination, timing, rhythm" },
          { name: "Shadow Boxing", sets: 6, reps: "3 min", rest: 60 },
          { name: "Bear Crawl", sets: 5, reps: "20 meters", rest: 45 },
          { name: "Squat Jump", sets: 5, reps: "10", rest: 60 },
          { name: "Burpee", sets: 5, reps: "15", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0 },
        ],
      },
      {
        dayNumber: 6,
        name: "Saturday — Performance Day",
        exercises: [
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0, notes: "Extensive warm-up for full performance" },
          { name: "Forms Practice (Kata/Taolu)", sets: 6, reps: "5 min", rest: 60 },
          { name: "Isometric Horse Stance", sets: 5, reps: "3 min", rest: 60 },
          { name: "Round Kick Drill", sets: 5, reps: "30 each leg", rest: 45 },
          { name: "Side Kick Drill", sets: 5, reps: "30 each leg", rest: 45 },
          { name: "Heavy Bag Work", sets: 6, reps: "3 min", rest: 60 },
          { name: "Shadow Boxing", sets: 6, reps: "3 min", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0, notes: "Cool down — maintain full splits daily" },
        ],
      },
    ],
  });
  console.log("  ✓ Jackie Chan: Stuntman Conditioning");

  // =========================================================================
  // 8. WING CHUN — Ip Man Traditional Training
  // =========================================================================
  // Ip Man was Bruce Lee's sifu and the grandmaster who brought Wing Chun to
  // the world. Traditional Wing Chun training follows a systematic curriculum:
  // Siu Nim Tao, Chum Kiu, Biu Gee forms, wooden dummy, and Chi Sao.
  // =========================================================================
  await upsertProgram(userId, {
    name: "Ip Man: Wing Chun Traditional Training",
    description:
      "Traditional Wing Chun kung fu training curriculum as taught by Grandmaster Ip Man — the sifu who taught Bruce Lee. " +
      "Wing Chun is a close-range system emphasizing economy of motion, simultaneous attack and defense, and relaxed power. " +
      "Ip Man's training was systematic: forms, wooden dummy, chi sao (sticky hands), and partner drilling. " +
      "This is the foundation Bruce Lee built Jeet Kune Do upon. " +
      "DIFFICULTY: Intermediate — requires patience and consistent practice.",
    daysPerWeek: 5,
    durationWeeks: 12,
    days: [
      {
        dayNumber: 1,
        name: "Monday — Siu Nim Tao (Little Idea Form)",
        exercises: [
          { name: "Full Body Stretch", sets: 1, reps: "15 min", rest: 0, notes: "Warm-up for Wing Chun practice" },
          { name: "Isometric Horse Stance", sets: 5, reps: "5 min hold", rest: 60, notes: "Wing Chun standing position (YJKYM) — build this gradually" },
          { name: "Forms Practice (Kata/Taolu)", sets: 10, reps: "Siu Nim Tao (10 min slow)", rest: 60, notes: "The first Wing Chun form. Done slowly to develop correct structure and elbow energy." },
          { name: "Knuckle Push-Up", sets: 5, reps: "20", rest: 60, notes: "Condition the knuckles and wrists for Wing Chun striking" },
          { name: "Wrist Roller", sets: 3, reps: "3 rolls", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "15 min", rest: 0 },
        ],
      },
      {
        dayNumber: 2,
        name: "Tuesday — Wooden Dummy (Mook Yan Jong)",
        exercises: [
          { name: "Isometric Horse Stance", sets: 3, reps: "3 min", rest: 60, notes: "Stance training before dummy work" },
          { name: "Wooden Dummy (Mook Yan Jong)", sets: 10, reps: "5 min per section", rest: 60, notes: "The 116-technique Muk Yan Jong form. Practice each section slowly then connect." },
          { name: "Knuckle Push-Up", sets: 5, reps: "20", rest: 60, notes: "Condition striking surfaces — dummy work requires tough hands" },
          { name: "Wrist Roller", sets: 3, reps: "3 rolls", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 3,
        name: "Wednesday — Chi Sao & Partner Drills",
        exercises: [
          { name: "Forms Practice (Kata/Taolu)", sets: 5, reps: "Siu Nim Tao x5", rest: 30, notes: "Review form before partnered practice" },
          { name: "Chi Sao (Sticky Hands)", sets: 10, reps: "5 min", rest: 60, notes: "Dan Chi (single hand) and Luk Sao (rolling hands). The soul of Wing Chun." },
          { name: "Focus Mitt Work", sets: 5, reps: "3 min", rest: 60, notes: "Chain punch drills and single-hand striking" },
          { name: "Knuckle Push-Up", sets: 5, reps: "25", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "15 min", rest: 0 },
        ],
      },
      {
        dayNumber: 4,
        name: "Thursday — Chum Kiu (Bridging the Gap)",
        exercises: [
          { name: "Isometric Horse Stance", sets: 3, reps: "3 min", rest: 60 },
          { name: "Forms Practice (Kata/Taolu)", sets: 8, reps: "Chum Kiu form x8", rest: 60, notes: "The second Wing Chun form — introduces stepping, turning, and kicks" },
          { name: "Side Kick Drill", sets: 4, reps: "20 each leg", rest: 45, notes: "Wing Chun kicks: front kick and side kick, low to mid level" },
          { name: "Wooden Dummy (Mook Yan Jong)", sets: 5, reps: "5 min", rest: 60 },
          { name: "Wrist Roller", sets: 4, reps: "3 rolls", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "20 min", rest: 0 },
        ],
      },
      {
        dayNumber: 5,
        name: "Friday — Integration & Flow",
        exercises: [
          { name: "Forms Practice (Kata/Taolu)", sets: 3, reps: "All 3 forms (Siu Nim Tao, Chum Kiu, Biu Gee)", rest: 120, notes: "Full system review — link all three forms" },
          { name: "Wooden Dummy (Mook Yan Jong)", sets: 8, reps: "5 min", rest: 60, notes: "Full 116-technique form" },
          { name: "Chi Sao (Sticky Hands)", sets: 8, reps: "5 min", rest: 60, notes: "Free Chi Sao — flow, don't force" },
          { name: "Knuckle Push-Up", sets: 5, reps: "25", rest: 60 },
          { name: "Full Body Stretch", sets: 1, reps: "30 min", rest: 0, notes: "End every session with thorough stretching" },
        ],
      },
    ],
  });
  console.log("  ✓ Ip Man: Wing Chun Traditional Training");

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║        LEGENDARY FIGHTER PROGRAMS SEEDED SUCCESSFULLY        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Programs created for user: me@workout.app                   ║
║                                                              ║
║  1. Bruce Lee: Jeet Kune Do Conditioning        [Advanced]   ║
║  2. Mike Tyson: Iron Mike's Peak Conditioning   [Elite]      ║
║  3. Muhammad Ali: Float Like a Butterfly        [Advanced]   ║
║  4. GSP: The Rush                               [Elite]      ║
║  5. Conor McGregor: The Notorious Movement      [Advanced]   ║
║  6. Rickson Gracie: BJJ Mastery                 [Intermediate]║
║  7. Jackie Chan: Stuntman Conditioning          [Intermediate]║
║  8. Ip Man: Wing Chun Traditional Training      [Intermediate]║
║                                                              ║
║  Login at: me@workout.app / Workout1!                        ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// ---------------------------------------------------------------------------
// Upsert helper — deletes existing program with same name for this user,
// then creates fresh (avoids duplicates on repeated runs)
// ---------------------------------------------------------------------------
type ExerciseRef = {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes?: string;
};

type DayDef = {
  dayNumber: number;
  name: string;
  exercises: ExerciseRef[];
};

type ProgramDef = {
  name: string;
  description: string;
  daysPerWeek: number;
  durationWeeks: number;
  days: DayDef[];
};

async function upsertProgram(userId: string, def: ProgramDef) {
  // Remove existing program with the same name for this user
  const existing = await prisma.workoutProgram.findFirst({
    where: { userId, name: def.name },
  });
  if (existing) {
    await prisma.workoutProgram.delete({ where: { id: existing.id } });
  }

  // Resolve exercise IDs
  const days = await Promise.all(
    def.days.map(async (day) => {
      const exercises = await Promise.all(
        day.exercises.map(async (ex, index) => {
          // Some exercise names may include parenthetical notes from the program
          // e.g. "Clean and Press (use Overhead Press)" — strip to actual name
          const name = ex.name.replace(/\s*\(use [^)]+\)/, "").trim();
          // Try exact match first, then the parenthetical hint
          let id: string;
          try {
            id = await getExerciseId(name);
          } catch {
            // Try fallback name extracted from parenthetical
            const fallbackMatch = ex.name.match(/\(use ([^)]+)\)/);
            if (fallbackMatch) {
              id = await getExerciseId(fallbackMatch[1].trim());
            } else {
              throw new Error(`Cannot find exercise: "${ex.name}"`);
            }
          }
          return {
            exerciseId: id,
            order: index + 1,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.rest,
            notes: ex.notes,
          };
        })
      );
      return { dayNumber: day.dayNumber, name: day.name, exercises };
    })
  );

  await prisma.workoutProgram.create({
    data: {
      userId,
      name: def.name,
      description: def.description,
      daysPerWeek: def.daysPerWeek,
      durationWeeks: def.durationWeeks,
      active: false,
      days: {
        create: days.map((day) => ({
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
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
