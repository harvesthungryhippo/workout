import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, hashPassword, validatePasswordStrength, isPasswordInHistory } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { getSessionFromRequest } from "@/lib/auth/session";
import { AuditEventType } from "@prisma/client";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  if (body.newPassword === body.currentPassword) {
    return NextResponse.json({ error: "New password must be different from current password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { passwordHistory: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Verify current password (user is already authenticated — no lockout increment)
  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const strength = validatePasswordStrength(body.newPassword, user.email, user.firstName);
  if (!strength.valid) return NextResponse.json({ error: strength.error }, { status: 400 });

  if (await isPasswordInHistory(body.newPassword, user.passwordHistory)) {
    return NextResponse.json({ error: "You cannot reuse one of your last 5 passwords." }, { status: 400 });
  }

  const newHash = await hashPassword(body.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, forcePasswordChange: false },
    }),
    prisma.passwordHistory.create({ data: { userId: user.id, passwordHash: newHash } }),
  ]);

  // Revoke all other sessions — keep the current one active
  await revokeAllUserSessions(user.id, session.sessionId);

  await prisma.auditLog.create({
    data: { businessId: user.businessId, userId: user.id, event: AuditEventType.PASSWORD_CHANGED },
  });

  // TODO: queue confirmation email

  return NextResponse.json({ message: "Password changed. All other sessions have been signed out." });
}
