import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { seedLegendaryPrograms } from "@/seed-legendary";

// POST /api/admin/seed-legendary
// Protected by JWT_SECRET in Authorization header
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.JWT_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await seedLegendaryPrograms(prisma);
    return NextResponse.json({ ok: true, message: "Legendary programs seeded." });
  } catch (e) {
    console.error("seed-legendary error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
