import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getNutrition(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  const where: Record<string, unknown> = { userId: req.session.userId };
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.date = { gte: start, lt: end };
  }

  const entries = await prisma.nutritionEntry.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ entries });
}

const createSchema = z.object({
  mealName: z.string().min(1),
  calories: z.number().int().positive().optional(),
  proteinG: z.number().positive().optional(),
  carbsG: z.number().positive().optional(),
  fatG: z.number().positive().optional(),
  notes: z.string().optional(),
  date: z.string().optional(), // ISO string
});

async function createEntry(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const entry = await prisma.nutritionEntry.create({
    data: {
      userId: req.session.userId,
      mealName: body.mealName,
      calories: body.calories ?? null,
      proteinG: body.proteinG ?? null,
      carbsG: body.carbsG ?? null,
      fatG: body.fatG ?? null,
      notes: body.notes ?? null,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export const GET = withAuth(getNutrition);
export const POST = withAuth(createEntry);
