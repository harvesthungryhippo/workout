import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

const updateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  label: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

async function updateReminder(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const reminder = await prisma.workoutReminder.findUnique({ where: { id } });
    if (!reminder || reminder.userId !== req.session.userId)
      return NextResponse.json({ error: "Not found." }, { status: 404 });

    let body: z.infer<typeof updateSchema>;
    try { body = updateSchema.parse(await req.json()); }
    catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

    const updated = await prisma.workoutReminder.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[reminders/[id] PATCH] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

async function deleteReminder(req: AuthedRequest, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const reminder = await prisma.workoutReminder.findUnique({ where: { id } });
    if (!reminder || reminder.userId !== req.session.userId)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    await prisma.workoutReminder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reminders/[id] DELETE] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const PATCH = withAuth(updateReminder);
export const DELETE = withAuth(deleteReminder);
