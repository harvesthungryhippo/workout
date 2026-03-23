import { NextResponse } from "next/server";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";
import { prisma } from "@/lib/db/prisma";

async function checkDueReminders(req: AuthedRequest) {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun ... 6=Sat
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const reminders = await prisma.workoutReminder.findMany({
      where: { userId: req.session.userId, enabled: true, dayOfWeek },
    });

    const dueReminders = reminders.filter((r) => {
      const [rh, rm] = r.time.split(":").map(Number);
      const reminderMinutes = rh * 60 + rm;
      const nowMinutes = currentHour * 60 + currentMinute;
      return Math.abs(reminderMinutes - nowMinutes) <= 1;
    }).map((r) => ({
      id: r.id,
      message: r.label ?? "Time for your workout!",
    }));

    return NextResponse.json({ dueReminders });
  } catch (e) {
    console.error("[reminders/check POST] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const POST = withAuth(checkDueReminders);
