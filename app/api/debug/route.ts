import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: "ok", url: process.env.DATABASE_URL ? "set" : "missing" });
  } catch (e) {
    return NextResponse.json({ db: "error", error: String(e), url: process.env.DATABASE_URL ? "set" : "missing" }, { status: 500 });
  }
}
