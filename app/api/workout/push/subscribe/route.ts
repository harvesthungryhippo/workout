import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function subscribe(req: AuthedRequest) {
  const body = await req.json();
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.workoutPushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: req.session.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      userId: req.session.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

async function unsubscribe(req: AuthedRequest) {
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await prisma.workoutPushSubscription.deleteMany({
    where: { userId: req.session.userId, endpoint },
  });
  return NextResponse.json({ ok: true });
}

export const POST = withAuth(subscribe);
export const DELETE = withAuth(unsubscribe);
