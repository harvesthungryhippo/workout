import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin, type AuthedRequest } from "@/lib/api/withAdmin";
import type { Params } from "@/lib/api/withAuth";
import { OrgRole } from "@prisma/client";

async function addMember(req: AuthedRequest, ctx: Params) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { email, role } = body as { email: string; role: OrgRole };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!role || !Object.values(OrgRole).includes(role)) {
    return NextResponse.json({ error: "Valid role is required." }, { status: 400 });
  }

  const user = await prisma.workoutUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }

  const updated = await prisma.workoutUser.update({
    where: { id: user.id },
    data: { organizationId: id, orgRole: role },
    select: { id: true, name: true, email: true, orgRole: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

async function changeMemberRole(req: AuthedRequest, _ctx: Params) {
  const body = await req.json();
  const { userId, role } = body as { userId: string; role: OrgRole };

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  if (!role || !Object.values(OrgRole).includes(role)) {
    return NextResponse.json({ error: "Valid role is required." }, { status: 400 });
  }

  try {
    const updated = await prisma.workoutUser.update({
      where: { id: userId },
      data: { orgRole: role },
      select: { id: true, name: true, email: true, orgRole: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    throw err;
  }
}

async function removeMember(req: AuthedRequest, _ctx: Params) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required." }, { status: 400 });
  }

  try {
    await prisma.workoutUser.update({
      where: { id: userId },
      data: { organizationId: null, orgRole: OrgRole.MEMBER },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    throw err;
  }
}

export const POST = withAdmin(addMember);
export const PATCH = withAdmin(changeMemberRole);
export const DELETE = withAdmin(removeMember);
