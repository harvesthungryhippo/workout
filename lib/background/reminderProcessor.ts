"use client";

// Background reminder processor using setInterval
// Checks reminders every minute and triggers browser notifications

export interface ReminderCheckConfig {
  userId: string;
  intervalMs?: number;
}

let processorInterval: ReturnType<typeof setInterval> | null = null;

async function checkReminders(userId: string): Promise<void> {
  try {
    const response = await fetch("/api/workout/reminders/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) return;

    const data = await response.json();
    const dueReminders: Array<{ id: string; message: string }> = data.dueReminders ?? [];

    for (const reminder of dueReminders) {
      if (Notification.permission === "granted") {
        new Notification("Workout Reminder", {
          body: reminder.message || "Time for your workout!",
          icon: "/favicon.ico",
        });
      }
    }
  } catch {
    // Silently fail - background process should not disrupt UX
  }
}

export function startBackgroundProcessing(config: ReminderCheckConfig): void {
  if (processorInterval) return; // Already running

  const { userId, intervalMs = 60_000 } = config;

  // Request notification permission
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }

  // Run immediately then on interval
  checkReminders(userId);
  processorInterval = setInterval(() => checkReminders(userId), intervalMs);
}

export function stopBackgroundProcessing(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
}
