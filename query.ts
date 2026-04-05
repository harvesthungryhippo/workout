import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const sets = await prisma.workoutSet.findMany({
    where: { weightKg: { gte: 50 } },
    include: {
      sessionExercise: {
        include: { exercise: { select: { name: true } } }
      }
    },
    orderBy: { weightKg: 'desc' },
    take: 30,
  });
  for (const s of sets) {
    const kg = Number(s.weightKg);
    const lbs = (kg * 2.2046).toFixed(1);
    console.log(`${s.sessionExercise.exercise.name} | ${kg} kg (${lbs} lbs)`);
  }
  await prisma.$disconnect();
}

main();
