import { NextResponse } from "next/server";
import { getSessionFromRequest, revokeSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditEventType } from "@prisma/client";

export async function POST() {
  const session = await getSessionFromRequest();

  if (session) {
    await revokeSession(session.sessionId);
    await prisma.auditLog.create({
      data: {
        businessId: session.businessId,
        userId: session.userId,
        event: AuditEventType.LOGOUT,
      },
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("refresh_token");
  res.cookies.delete("access_token");
  return res;
}
