import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest, type Params } from "@/lib/api/withAuth";

const updateSchema = z.object({
  mealName: z.string().min(1).optional(),
  calories: z.number().int().positive().nullable().optional(),
  proteinG: z.number().positive().nullable().optional(),
  carbsG: z.number().positive().nullable().optional(),
  fatG: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

async function updateEntry(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const entry = await prisma.nutritionEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== req.session.userId)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: z.infer<typeof updateSchema>;
  try { body = updateSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const updated = await prisma.nutritionEntry.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}

async function deleteEntry(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const entry = await prisma.nutritionEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== req.session.userId)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.nutritionEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = withAuth(updateEntry);
export const DELETE = withAuth(deleteEntry);
