import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

const updateSchema = z.object({ memberId: z.string(), role: z.enum(["ADMIN", "MEMBER"]) });
const removeSchema = z.object({ memberId: z.string() });

// PATCH /api/workout/org/members — change a member's role
async function updateRole(req: AuthedRequest) {
  const actor = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { organizationId: true, orgRole: true },
  });
  if (!actor?.organizationId) return NextResponse.json({ error: "Not in an org." }, { status: 400 });
  if (actor.orgRole !== "OWNER" && actor.orgRole !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  let body: z.infer<typeof updateSchema>;
  try { body = updateSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  if (body.memberId === req.session.userId) {
    return NextResponse.json({ error: "Cannot change your own role." }, { status: 400 });
  }

  const target = await prisma.workoutUser.findUnique({ where: { id: body.memberId }, select: { organizationId: true, orgRole: true } });
  if (!target || target.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (target.orgRole === "OWNER") {
    return NextResponse.json({ error: "Cannot change owner's role." }, { status: 403 });
  }

  await prisma.workoutUser.update({ where: { id: body.memberId }, data: { orgRole: body.role } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/workout/org/members — remove a member
async function removeMember(req: AuthedRequest) {
  const actor = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { organizationId: true, orgRole: true },
  });
  if (!actor?.organizationId) return NextResponse.json({ error: "Not in an org." }, { status: 400 });
  if (actor.orgRole === "MEMBER") return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });

  let body: z.infer<typeof removeSchema>;
  try { body = removeSchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  if (body.memberId === req.session.userId) {
    return NextResponse.json({ error: "Use the leave button to remove yourself." }, { status: 400 });
  }

  const target = await prisma.workoutUser.findUnique({ where: { id: body.memberId }, select: { organizationId: true, orgRole: true } });
  if (!target || target.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (target.orgRole === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the owner." }, { status: 403 });
  }

  await prisma.workoutUser.update({ where: { id: body.memberId }, data: { organizationId: null } });
  return NextResponse.json({ ok: true });
}

export const PATCH = withAuth(updateRole);
export const DELETE = withAuth(removeMember);
