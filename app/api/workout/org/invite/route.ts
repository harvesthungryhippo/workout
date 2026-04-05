import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

const schema = z.object({ email: z.string().email() });

// POST /api/workout/org/invite — add an existing user to org by email
async function inviteMember(req: AuthedRequest) {
  const actor = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { organizationId: true, orgRole: true },
  });
  if (!actor?.organizationId) return NextResponse.json({ error: "You are not in an organization." }, { status: 400 });
  if (actor.orgRole === "MEMBER") return NextResponse.json({ error: "Only admins can invite members." }, { status: 403 });

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid email." }, { status: 400 }); }

  const target = await prisma.workoutUser.findUnique({ where: { email: body.email } });
  if (!target) return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  if (target.organizationId) return NextResponse.json({ error: "That user is already in an organization." }, { status: 409 });

  await prisma.workoutUser.update({
    where: { id: target.id },
    data: { organizationId: actor.organizationId, orgRole: "MEMBER" },
  });

  return NextResponse.json({ ok: true, member: { id: target.id, name: target.name, email: target.email, orgRole: "MEMBER" } });
}

export const POST = withAuth(inviteMember);
