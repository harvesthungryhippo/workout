import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAdmin, type AuthedRequest } from "@/lib/api/withAdmin";
import type { Params } from "@/lib/api/withAuth";

async function getFeedback(_req: AuthedRequest, _ctx: Params) {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(feedback);
}

export const GET = withAdmin(getFeedback);
