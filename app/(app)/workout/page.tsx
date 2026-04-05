"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dumbbell, TrendingUp, Calendar, Flame, Plus, Play, Target, CheckCircle2, Circle, Sparkles, Pencil, Droplets, Moon } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/date";

function GoalRing({ done, goal }: { done: number; goal: number }) {
  const r = 28, cx = 32, cy = 32, stroke = 5;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, goal > 0 ? done / goal : 0);
  return (
    <svg width={64} height={64} className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-100 dark:text-gray-800" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className={pct >= 1 ? "text-green-500" : "text-indigo-500"}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" className="fill-gray-900 dark:fill-white">
        {done}/{goal}
      </text>
    </svg>
  );
}

interface Stats {
  sessionCount: number;
  sessionsPerWeek: number;
  totalVolume: number;
  volumeTrend: number;
  currentStreak: number;
  longestStreak: number;
  prs: { exerciseName: string; maxWeight: number; maxReps: number }[];
  recentSessions: {
    id: string;
    name: string | null;
    startedAt: string;
    completedAt: string | null;
    durationSeconds: number | null;
    exerciseCount: number;
    volume: number;
  }[];
  weekly: {
    thisSessions: number;
    lastSessions: number;
    thisVolume: number;
    lastVolume: number;
  };
}

interface ActiveProgram {
  id: string;
  name: string;
  daysPerWeek: number;
  days: { id: string; dayNumber: number; name: string }[];
}

function StatCard({
  title, value, description, icon: Icon, sub,
}: {
  title: string; value: string | number; description: string; icon: React.ElementType; sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
        {sub && <p className="text-xs font-medium text-green-600 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

function formatVolume(lb: number) {
  if (lb >= 1000) return `${(lb / 1000).toFixed(1)}k lb`;
  return `${lb} lb`;
}

function QuickWater() {
  const [totalMl, setTotalMl] = useState<number | null>(null);
  const GOAL_ML = 2700;
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch(`/api/workout/water?date=${today}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setTotalMl(d.totalMl ?? 0); })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function log(ml: number) {
    const res = await fetch("/api/workout/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMl: ml, date: new Date().toISOString() }),
    });
    if (res.ok) setTotalMl((prev) => (prev ?? 0) + ml);
  }

  const oz = totalMl !== null ? Math.round(totalMl / 29.574) : null;
  const pct = totalMl !== null ? Math.min(100, Math.round((totalMl / GOAL_ML) * 100)) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-blue-400" /> Water
          </CardTitle>
          <Link href="/workout/water" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xl font-bold">{oz !== null ? `${oz} oz` : "—"}</p>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-1.5">
          {[{ label: "8 oz", ml: 237 }, { label: "16 oz", ml: 473 }].map(({ label, ml }) => (
            <button
              key={label}
              onClick={() => log(ml)}
              className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              +{label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickSleep() {
  const [last, setLast] = useState<{ durationMins: number } | null | undefined>(undefined);
  const [logging, setLogging] = useState(false);
  const [hours, setHours] = useState("");

  useEffect(() => {
    fetch("/api/workout/sleep?limit=1")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setLast(d?.entries?.[0] ?? null))
      .catch(() => setLast(null));
  }, []);

  async function logSleep() {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    const res = await fetch("/api/workout/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMins: Math.round(h * 60), date: new Date().toISOString() }),
    });
    if (res.ok) {
      const entry = await res.json();
      setLast(entry);
      setHours("");
      setLogging(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-indigo-400" /> Sleep
          </CardTitle>
          <Link href="/workout/sleep" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xl font-bold">
          {last === undefined ? "—" : last ? `${(last.durationMins / 60).toFixed(1)}h` : "—"}
        </p>
        <p className="text-xs text-gray-400">Last night</p>
        {!logging ? (
          <button
            onClick={() => setLogging(true)}
            className="w-full rounded-md border border-gray-200 dark:border-gray-700 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            + Log sleep
          </button>
        ) : (
          <div className="flex gap-1.5">
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="hrs"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-white outline-none"
              autoFocus
            />
            <button onClick={logSleep} className="rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-2 py-1 text-xs font-medium">Save</button>
            <button onClick={() => setLogging(false)} className="text-xs text-gray-400 px-1">✕</button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkoutPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(4);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("4");

  useEffect(() => {
    const saved = localStorage.getItem("weekly_session_goal");
    if (saved) { const n = parseInt(saved); if (n > 0) { setWeeklyGoal(n); setGoalDraft(String(n)); } }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/workout/stats?days=30").then((r) => r.ok ? r.json() : null),
      fetch("/api/workout/programs").then((r) => r.ok ? r.json() : null),
    ])
      .then(([s, p]) => {
        if (s?.sessionCount !== undefined) setStats(s);
        const active = p?.programs?.find((prog: ActiveProgram & { active: boolean }) => prog.active) ?? null;
        setActiveProgram(active);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workout</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track sessions, follow programs, and monitor progress.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workout/log-past">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Log Past
            </Button>
          </Link>
          <Link href="/workout/log">
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Sessions (30d)"
              value={stats?.sessionCount ?? 0}
              description={`${stats?.sessionsPerWeek ?? 0}/week average`}
              icon={Calendar}
            />
            <StatCard
              title="Total Volume"
              value={formatVolume(stats?.totalVolume ?? 0)}
              description="Last 30 days"
              icon={Dumbbell}
              sub={stats?.volumeTrend ? `${stats.volumeTrend > 0 ? "+" : ""}${stats.volumeTrend}% vs prev month` : undefined}
            />
            <StatCard
              title="Current Streak"
              value={`${stats?.currentStreak ?? 0} days`}
              description={`Best: ${stats?.longestStreak ?? 0} days`}
              icon={Flame}
            />
            <StatCard
              title="Active Program"
              value={activeProgram ? activeProgram.name : "None"}
              description={activeProgram ? `${activeProgram.daysPerWeek} days/week` : "No active program"}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Sessions</CardTitle>
              <CardDescription>Your last workouts</CardDescription>
            </div>
            <Link href="/workout/progress">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : stats?.recentSessions?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No sessions yet. Start one!</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentSessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{s.name ?? "Workout"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(s.startedAt)} · {s.exerciseCount} exercises
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{formatVolume(s.volume)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(s.durationSeconds)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary + Goal Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Week</CardTitle>
            <CardDescription>vs. last week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <>
                {/* Weekly goal ring */}
                <div className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3">
                  <GoalRing done={stats?.weekly?.thisSessions ?? 0} goal={weeklyGoal} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(stats?.weekly?.thisSessions ?? 0) >= weeklyGoal
                        ? "Weekly goal reached! 🎉"
                        : `${weeklyGoal - (stats?.weekly?.thisSessions ?? 0)} session${weeklyGoal - (stats?.weekly?.thisSessions ?? 0) !== 1 ? "s" : ""} to go`}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {stats?.weekly?.thisSessions ?? 0} of {weeklyGoal} sessions this week
                    </p>
                  </div>
                  {!editingGoal ? (
                    <button
                      onClick={() => { setGoalDraft(String(weeklyGoal)); setEditingGoal(true); }}
                      className="text-gray-300 hover:text-gray-500 transition-colors"
                      title="Edit weekly goal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={goalDraft}
                        onChange={(e) => setGoalDraft(e.target.value)}
                        className="w-12 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-1 text-sm text-center text-gray-900 dark:text-white outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const n = parseInt(goalDraft);
                          if (n > 0) { setWeeklyGoal(n); localStorage.setItem("weekly_session_goal", String(n)); }
                          setEditingGoal(false);
                        }}
                        className="text-xs text-green-600 font-medium hover:text-green-700 px-1"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <p className="text-sm font-medium">Volume</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Last week: {formatVolume(stats?.weekly?.lastVolume ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatVolume(stats?.weekly?.thisVolume ?? 0)}</p>
                    {(stats?.weekly?.lastVolume ?? 0) > 0 && (
                      <p className={`text-xs font-medium ${(stats?.weekly?.thisVolume ?? 0) >= (stats?.weekly?.lastVolume ?? 0) ? "text-green-600" : "text-red-500"}`}>
                        {(stats?.weekly?.thisVolume ?? 0) >= (stats?.weekly?.lastVolume ?? 0) ? "+" : ""}
                        {Math.round(((stats?.weekly?.thisVolume ?? 0) - (stats?.weekly?.lastVolume ?? 0)) / Math.max(stats?.weekly?.lastVolume ?? 1, 1) * 100)}% vs last
                      </p>
                    )}
                  </div>
                </div>
                <Link href="/workout/goals" className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span>View goals</span>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500">→</span>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onboarding — shown only when user has no sessions yet */}
      {!loading && (stats?.sessionCount ?? 0) === 0 && (
        <Card className="border-dashed bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <CardContent className="py-10 flex flex-col items-center text-center gap-4">
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Sparkles className="h-7 w-7 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Welcome! Let&apos;s get started</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                Log your first session, follow a structured program, or explore the app.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/workout/log">
                <Button className="gap-2">
                  <Play className="h-4 w-4" />
                  Log first workout
                </Button>
              </Link>
              <Link href="/workout/core-programs">
                <Button variant="outline" className="gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Browse programs
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-2 text-center">
              {[
                { href: "/workout/exercises", label: "Exercise library" },
                { href: "/workout/body", label: "Body tracking" },
                { href: "/workout/nutrition", label: "Nutrition log" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Program */}
      {!loading && activeProgram && (() => {
        // Find days completed this week by matching session names to program day names
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        weekStart.setHours(0, 0, 0, 0);
        const completedDayNames = new Set(
          (stats?.recentSessions ?? [])
            .filter((s) => new Date(s.startedAt) >= weekStart)
            .map((s) => s.name?.toLowerCase().trim())
            .filter(Boolean)
        );
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{activeProgram.name}</CardTitle>
                <CardDescription>Active program · {activeProgram.daysPerWeek} days/week</CardDescription>
              </div>
              <Link href={`/workout/programs/${activeProgram.id}`}>
                <Button variant="outline" size="sm">View program</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">This week</p>
              <div className="flex flex-wrap gap-2">
                {activeProgram.days.map((day) => {
                  const done = completedDayNames.has(day.name.toLowerCase().trim());
                  return (
                    <Link key={day.id} href={`/workout/log?programDayId=${day.id}&programId=${activeProgram.id}`}>
                      <Badge
                        variant={done ? "default" : "secondary"}
                        className={`cursor-pointer px-3 py-1.5 gap-1.5 transition-colors ${done ? "bg-green-600 hover:bg-green-700 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                      >
                        {done
                          ? <CheckCircle2 className="h-3 w-3" />
                          : <Circle className="h-3 w-3 opacity-50" />
                        }
                        Day {day.dayNumber}: {day.name}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* No program CTA */}
      {!loading && !activeProgram && (stats?.sessionCount ?? 0) > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <Dumbbell className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No active program. Create one to follow a structured plan.</p>
            <Link href="/workout/programs">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Browse Programs
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick-log row: Water & Sleep */}
      <div className="grid grid-cols-2 gap-4">
        <QuickWater />
        <QuickSleep />
      </div>
    </div>
  );
}
