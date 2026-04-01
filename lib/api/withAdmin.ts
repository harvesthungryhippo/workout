import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/isAdmin";
import type { AuthedRequest } from "./withAuth";
import type { Params } from "./withAuth";

type Handler = (req: AuthedRequest, ctx: Params) => Promise<NextResponse>;

export function withAdmin(handler: Handler) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const admin = await isAdmin(session.userId);
    if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    (req as AuthedRequest).session = session;
    return handler(req as AuthedRequest, ctx);
  };
}
