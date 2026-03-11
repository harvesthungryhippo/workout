import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, validatePasswordStrength, isPasswordInHistory } from "@/lib/auth/password";
import { generateOpaqueToken } from "@/lib/auth/token";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { AuditEventType } from "@prisma/client";
import { createHash } from "crypto";

const RESET_RATE_LIMIT = 3; // per hour
const TOKEN_EXPIRY_HOURS = 1;
const SAME_RESPONSE = { message: "If this email is on file, a reset link has been sent." };

const requestSchema = z.object({ email: z.string().email() });
const confirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/reset-password — request a reset link
export async function POST(req: NextRequest) {
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { email: body.email } });

  // Always return the same response — prevents email enumeration
  if (!user) return NextResponse.json(SAME_RESPONSE);

  // Rate limit: max 3 reset requests per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });

  if (recentRequests >= RESET_RATE_LIMIT) return NextResponse.json(SAME_RESPONSE);

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
  });

  await prisma.auditLog.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      event: AuditEventType.PASSWORD_RESET_REQUESTED,
    },
  });

  // TODO: queue email with reset link containing the raw token
  console.log(`[RESET LINK] /reset-password?token=${token}`);

  return NextResponse.json(SAME_RESPONSE);
}

// PUT /api/auth/reset-password — set the new password with a valid token
export async function PUT(req: NextRequest) {
  let body: z.infer<typeof confirmSchema>;
  try {
    body = confirmSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const tokenHash = hashToken(body.token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    // Invalidate if already used (replay protection)
    if (resetToken && !resetToken.usedAt) {
      await prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
    }
    return NextResponse.json({ error: "Reset link is invalid or has expired. Please request a new one." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: resetToken.userId },
    include: { passwordHistory: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const strength = validatePasswordStrength(body.newPassword, user.email, user.firstName);
  if (!strength.valid) return NextResponse.json({ error: strength.error }, { status: 400 });

  if (await isPasswordInHistory(body.newPassword, user.passwordHistory)) {
    return NextResponse.json({ error: "You cannot reuse one of your last 5 passwords." }, { status: 400 });
  }

  const newHash = await hashPassword(body.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash, failedAttempts: 0, status: "ACTIVE" } }),
    prisma.passwordHistory.create({ data: { userId: user.id, passwordHash: newHash } }),
    prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
  ]);

  await revokeAllUserSessions(user.id);

  await prisma.auditLog.create({
    data: { businessId: user.businessId, userId: user.id, event: AuditEventType.PASSWORD_RESET_COMPLETED },
  });

  // TODO: queue confirmation email

  return NextResponse.json({ message: "Password updated. Please log in with your new password." });
}
