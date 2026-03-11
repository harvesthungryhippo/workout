import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import type { TokenPayload } from "@/lib/auth/token";

export type AuthedRequest = NextRequest & { session: TokenPayload };

export type Params = { params: Promise<Record<string, string>> };
type Handler = (req: AuthedRequest, ctx: Params) => Promise<NextResponse>;

// Wraps a route handler — injects session, optionally enforces roles
export function withAuth(handler: Handler, allowedRoles?: UserRole[]) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getSessionFromRequest();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes(session.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    (req as AuthedRequest).session = session;
    return handler(req as AuthedRequest, ctx);
  };
}
