import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { issueToken } from "@/lib/auth/token";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rateLimit";
import bcrypt from "bcryptjs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) return rateLimitResponse();

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Server misconfigured: JWT_SECRET is not set." }, { status: 500 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Server misconfigured: DATABASE_URL is not set." }, { status: 500 });
  }

  let user;
  try {
    user = await prisma.workoutUser.findUnique({ where: { email: body.email } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Database error: ${msg}` }, { status: 500 });
  }

  if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const token = issueToken({ userId: user.id });
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });
  return res;
}
