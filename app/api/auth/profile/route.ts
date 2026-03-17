import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import bcrypt from "bcryptjs";

// GET /api/auth/profile
async function getProfile(req: AuthedRequest) {
  const user = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(user);
}

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

// PATCH /api/auth/profile
async function updateProfile(req: AuthedRequest) {
  let body: z.infer<typeof updateSchema>;
  try { body = updateSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const user = await prisma.workoutUser.findUnique({ where: { id: req.session.userId } });
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // If changing password, verify current password
  if (body.newPassword) {
    if (!body.currentPassword) return NextResponse.json({ error: "Current password required." }, { status: 400 });
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  // If changing email, check uniqueness
  if (body.email && body.email !== user.email) {
    const existing = await prisma.workoutUser.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const updated = await prisma.workoutUser.update({
    where: { id: req.session.userId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.newPassword ? { passwordHash: await bcrypt.hash(body.newPassword, 12) } : {}),
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export const GET = withAuth(getProfile);
export const PATCH = withAuth(updateProfile);
