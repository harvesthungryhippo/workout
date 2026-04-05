import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const user = await prisma.workoutUser.findUnique({ where: { verificationToken: token } });
  if (!user) return NextResponse.json({ error: "Invalid or already used verification link." }, { status: 400 });

  await prisma.workoutUser.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
