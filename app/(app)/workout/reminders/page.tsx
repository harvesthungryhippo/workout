"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  id: string;
  dayOfWeek: number;
  time: string;
  label: string | null;
  enabled: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const scheduledRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifPerm(Notification.permission);
    }
    fetch("/api/workout/reminders")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setReminders(d.reminders ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Schedule browser notifications for enabled reminders
  useEffect(() => {
    if (notifPerm !== "granted") return;

    // Clear existing timers
    scheduledRef.current.forEach((t) => clearTimeout(t));
    scheduledRef.current.clear();

    const now = new Date();

    for (const reminder of reminders) {
      if (!reminder.enabled) continue;

      const [h, m] = reminder.time.split(":").map(Number);
      const next = new Date();
      next.setHours(h, m, 0, 0);

      // Find the next occurrence of the day
      const daysUntil = (reminder.dayOfWeek - now.getDay() + 7) % 7;
      next.setDate(next.getDate() + (daysUntil === 0 && next <= now ? 7 : daysUntil));

      const msUntil = next.getTime() - now.getTime();
      if (msUntil > 0 && msUntil < 7 * 24 * 60 * 60 * 1000) {
        const t = setTimeout(() => {
          new Notification("Workout Reminder", {
            body: reminder.label ?? `Time for your ${FULL_DAYS[reminder.dayOfWeek]} workout!`,
            icon: "/favicon.ico",
          });
        }, msUntil);
        scheduledRef.current.set(reminder.id, t);
      }
    }

    return () => {
      scheduledRef.current.forEach((t) => clearTimeout(t));
    };
  }, [reminders, notifPerm]);

  async function requestPermission() {
    if (typeof Notification === "undefined") { toast.error("Notifications not supported in this browser."); return; }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") toast.success("Notifications enabled!");
    else toast.error("Notification permission denied.");
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/workout/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, time, label: label.trim() || undefined }),
    });
    if (res.ok) {
      const r = await res.json();
      setReminders((prev) => [...prev, r]);
      setLabel(""); setShowForm(false);
      toast.success("Reminder created.");
    } else {
      toast.error("Failed to create reminder.");
    }
    setSaving(false);
  }

  async function toggleReminder(reminder: Reminder) {
    const res = await fetch(`/api/workout/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !reminder.enabled }),
    });
    if (res.ok) {
      setReminders((prev) => prev.map((r) => r.id === reminder.id ? { ...r, enabled: !r.enabled } : r));
    }
  }

  async function deleteReminder(id: string) {
    const res = await fetch(`/api/workout/reminders/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reminder deleted.");
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reminders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Schedule weekly workout reminders.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Add reminder
        </Button>
      </div>

      {/* Notification permission banner */}
      {notifPerm !== "granted" && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-4 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {notifPerm === "denied"
                  ? "Notifications blocked. Enable them in your browser settings."
                  : "Enable notifications to receive workout reminders."}
              </p>
            </div>
            {notifPerm !== "denied" && (
              <Button size="sm" variant="outline" onClick={requestPermission} className="shrink-0 border-orange-300 text-orange-700">
                Enable
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">New reminder</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addReminder} className="space-y-4">
              <div className="space-y-2">
                <Label>Day of week</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOfWeek(i)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${dayOfWeek === i ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Label (optional)</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Push day" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : "Add reminder"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reminders list */}
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No reminders set.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="divide-y">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${r.enabled ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"}`}>
                      {r.enabled ? <Bell className="h-4 w-4 text-gray-700 dark:text-gray-300" /> : <BellOff className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{FULL_DAYS[r.dayOfWeek]} at {r.time}</span>
                        {!r.enabled && <Badge variant="secondary" className="text-xs">Off</Badge>}
                      </div>
                      {r.label && <p className="text-xs text-gray-500 mt-0.5">{r.label}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleReminder(r)}
                      className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      {r.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteReminder(r.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-xs leading-relaxed">
            Reminders use your browser&apos;s notification system. You must have this tab open (or the app installed as a PWA) for notifications to fire. For reliable reminders, consider saving this app to your home screen.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
