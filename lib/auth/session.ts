import { prisma } from "@/lib/db/prisma";
import { verifyAccessToken, type TokenPayload } from "@/lib/auth/token";
import { cookies } from "next/headers";

const MAX_SESSIONS = 3;

export async function getSessionFromRequest(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return null;

    const payload = verifyAccessToken(token);

    // Check the session is not revoked
    const session = await prisma.session.findUnique({
      where: { tokenId: payload.sessionId },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  sessionId: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
) {
  // Enforce max concurrent sessions — revoke oldest if at limit
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  if (sessions.length >= MAX_SESSIONS) {
    await prisma.session.update({
      where: { id: sessions[0].id },
      data: { revokedAt: new Date() },
    });
  }

  return prisma.session.create({
    data: { userId, tokenId: sessionId, expiresAt, ipAddress, userAgent },
  });
}

export async function revokeSession(tokenId: string) {
  return prisma.session.updateMany({
    where: { tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string, exceptTokenId?: string) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptTokenId ? { tokenId: { not: exceptTokenId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}
