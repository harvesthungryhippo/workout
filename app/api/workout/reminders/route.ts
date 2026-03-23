import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getReminders(req: AuthedRequest) {
  try {
    const reminders = await prisma.workoutReminder.findMany({
      where: { userId: req.session.userId },
      orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
    });
    return NextResponse.json({ reminders });
  } catch (e) {
    console.error("[reminders GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().optional(),
  enabled: z.boolean().optional(),
});

async function createReminder(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const reminder = await prisma.workoutReminder.create({
    data: {
      userId: req.session.userId,
      dayOfWeek: body.dayOfWeek,
      time: body.time,
      label: body.label ?? null,
      enabled: body.enabled ?? true,
    },
  });
  return NextResponse.json(reminder, { status: 201 });
}

export const GET = withAuth(getReminders);
export const POST = withAuth(createReminder);
