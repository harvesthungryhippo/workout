import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/org — get current user's org + members
async function getOrg(req: AuthedRequest) {
  const user = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { organizationId: true, orgRole: true },
  });
  if (!user?.organizationId) return NextResponse.json({ org: null });

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
  });
  const members = await prisma.workoutUser.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true, email: true, orgRole: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ org, members, myRole: user.orgRole });
}

const createSchema = z.object({ name: z.string().min(1).max(80) });

// POST /api/workout/org — create a new org (user becomes OWNER)
async function createOrg(req: AuthedRequest) {
  const user = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { organizationId: true },
  });
  if (user?.organizationId) {
    return NextResponse.json({ error: "You are already in an organization." }, { status: 409 });
  }

  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" + Math.random().toString(36).slice(2, 6);

  const org = await prisma.organization.create({
    data: { id: crypto.randomUUID(), name: body.name, slug, updatedAt: new Date() },
  });
  await prisma.workoutUser.update({
    where: { id: req.session.userId },
    data: { organizationId: org.id, orgRole: "OWNER" },
  });

  return NextResponse.json({ org });
}

// DELETE /api/workout/org — leave or disband org
async function leaveOrg(req: AuthedRequest) {
  const user = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { organizationId: true, orgRole: true },
  });
  if (!user?.organizationId) return NextResponse.json({ error: "Not in an org." }, { status: 400 });

  if (user.orgRole === "OWNER") {
    // Check if there are other members
    const count = await prisma.workoutUser.count({ where: { organizationId: user.organizationId } });
    if (count > 1) {
      return NextResponse.json({ error: "Transfer ownership before leaving, or remove all members first." }, { status: 400 });
    }
    // Disband — remove org
    await prisma.workoutUser.update({ where: { id: req.session.userId }, data: { organizationId: null } });
    await prisma.organization.delete({ where: { id: user.organizationId } });
  } else {
    await prisma.workoutUser.update({ where: { id: req.session.userId }, data: { organizationId: null } });
  }

  return NextResponse.json({ ok: true });
}

export const GET = withAuth(getOrg);
export const POST = withAuth(createOrg);
export const DELETE = withAuth(leaveOrg);
