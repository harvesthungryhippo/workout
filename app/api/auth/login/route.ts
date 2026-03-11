import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { issueAccessToken, issueRefreshToken, generateSessionId } from "@/lib/auth/token";
import { createSession } from "@/lib/auth/session";
import { AuditEventType, UserStatus } from "@prisma/client";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 30;

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const INVALID_CREDENTIALS = "Invalid email or password.";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Always look up — never confirm whether the email exists
  const user = await prisma.user.findFirst({
    where: { email: body.email },
    include: { business: { select: { id: true } } },
  });

  async function logEvent(event: AuditEventType, details?: object) {
    if (!user) return;
    await prisma.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        event,
        details: details ?? {},
        ipAddress: ip,
      },
    });
  }

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  // Check lockout
  if (user.status === UserStatus.LOCKED) {
    const lockedAt = user.lockedAt!;
    const unlockAt = new Date(lockedAt.getTime() + LOCKOUT_MINUTES * 60_000);
    if (new Date() < unlockAt) {
      return NextResponse.json({ error: "Account is locked. Try again later or contact your admin." }, { status: 403 });
    }
    // Auto-unlock after lockout period
    await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", failedAttempts: 0, lockedAt: null } });
  }

  if (user.status === UserStatus.PENDING) {
    return NextResponse.json({ error: "Please complete your account setup before logging in." }, { status: 403 });
  }

  const valid = await verifyPassword(body.password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedAttempts + 1;

    if (attempts >= LOCKOUT_THRESHOLD) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: attempts, status: "LOCKED", lockedAt: new Date() },
      });
      await logEvent(AuditEventType.ACCOUNT_LOCKED, { attempts });
      // Notify business admin (email queued elsewhere)
      return NextResponse.json({ error: "Account locked after too many failed attempts." }, { status: 403 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: attempts } });
    await logEvent(AuditEventType.LOGIN_FAILED, { attempt: attempts });
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  // Success — reset failed attempts
  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0 } });

  const sessionId = generateSessionId();
  const accessExpiry = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const tokenPayload = {
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    sessionId,
  };

  const accessToken = issueAccessToken(tokenPayload);
  const refreshToken = issueRefreshToken(tokenPayload);

  await createSession(user.id, sessionId, refreshExpiry, ip, userAgent);
  await logEvent(AuditEventType.LOGIN);

  const res = NextResponse.json({
    accessToken,
    user: { id: user.id, role: user.role, businessId: user.businessId, forcePasswordChange: user.forcePasswordChange },
  });

  res.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: refreshExpiry,
    path: "/api/auth",
  });

  return res;
}
