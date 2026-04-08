import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.ADMIN_EMAIL ?? "admin@example.com"}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET so only Vercel cron can call this
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  // Find all enabled reminders due right now (within ±1 minute)
  const reminders = await prisma.workoutReminder.findMany({
    where: { enabled: true, dayOfWeek },
  });

  const dueReminders = reminders.filter((r) => {
    const [rh, rm] = r.time.split(":").map(Number);
    const reminderMinutes = rh * 60 + rm;
    const nowMinutes = currentHour * 60 + currentMinute;
    return Math.abs(reminderMinutes - nowMinutes) <= 1;
  });

  if (dueReminders.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const reminder of dueReminders) {
    const subscriptions = await prisma.workoutPushSubscription.findMany({
      where: { userId: reminder.userId },
    });

    const payload = JSON.stringify({
      title: "Workout Reminder",
      body: reminder.label ?? "Time for your workout!",
      tag: `reminder-${reminder.id}`,
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired — remove it
          await prisma.workoutPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          errors.push(String(err));
        }
      }
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
