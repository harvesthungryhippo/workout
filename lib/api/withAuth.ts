import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { TokenPayload } from "@/lib/auth/token";

export type AuthedRequest = NextRequest & { session: TokenPayload };
export type Params = { params: Promise<Record<string, string>> };
type Handler = (req: AuthedRequest, ctx: Params) => Promise<NextResponse>;

export function withAuth(handler: Handler) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    (req as AuthedRequest).session = session;
    return handler(req as AuthedRequest, ctx);
  };
}
