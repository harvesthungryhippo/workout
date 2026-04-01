import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

const schema = z.object({
  type: z.enum(["SUGGESTION", "BUG", "DATA_CORRECTION"]),
  message: z.string().min(1).max(2000),
});

async function submitFeedback(req: AuthedRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  const user = await prisma.workoutUser.findUnique({
    where: { id: req.session.userId },
    select: { email: true },
  });

  const feedback = await prisma.feedback.create({
    data: {
      userId: req.session.userId,
      userEmail: user?.email,
      type: body.type,
      message: body.message,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}

export const POST = withAuth(submitFeedback);
