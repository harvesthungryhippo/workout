import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { issueToken } from "@/lib/auth/token";
import { sendVerificationEmail } from "@/lib/email/resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const existing = await prisma.workoutUser.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.password, 12);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const user = await prisma.workoutUser.create({
    data: { email: body.email, passwordHash, name: body.name ?? null, verificationToken },
  });

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(user.email, verificationToken).catch(console.error);

  const token = issueToken({ userId: user.id });
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const res = NextResponse.json({ ok: true, emailVerificationSent: true });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });
  return res;
}
