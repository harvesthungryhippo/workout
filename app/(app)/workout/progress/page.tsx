"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Trophy, Trash2, Flame } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

interface DayData { count: number; volume: number; }

interface Stats {
  period: { days: number };
  sessionCount: number;
  prevSessionCount: number;
  sessionsPerWeek: number;
  totalVolume: number;
  prevVolume: number;
  volumeTrend: number;
  currentStreak: number;
  longestStreak: number;
  muscleGroupVolume: Record<string, number>;
  prs: { exerciseName: string; exerciseId: string; maxWeight: number; maxReps: number; maxVolume: number }[];
  recentSessions: {
    id: string; name: string | null; startedAt: string;
    completedAt: string | null; durationSeconds: number | null;
    exerciseCount: number; volume: number;
  }[];
  dayMap: Record<string, DayData>;
}

interface HistoryPoint { date: string; maxWeight: number; maxReps: number; totalVolume: number }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PERIODS = [7, 30, 90];

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: "#6366f1", BACK: "#8b5cf6", SHOULDERS: "#a78bfa",
  BICEPS: "#ec4899", TRICEPS: "#f43f5e", FOREARMS: "#f97316",
  CORE: "#eab308", QUADS: "#22c55e", HAMSTRINGS: "#10b981",
  GLUTES: "#14b8a6", CALVES: "#06b6d4", FULL_BODY: "#3b82f6",
};

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) return <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100"><TrendingUp className="h-3 w-3" />+{trend}%</Badge>;
  if (trend < 0) return <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100"><TrendingDown className="h-3 w-3" />{trend}%</Badge>;
  return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />Flat</Badge>;
}

function formatVolume(lb: number) {
  if (lb >= 1000) return `${(lb / 1000).toFixed(1)}k lb`;
  return `${Math.round(lb).toLocaleString()} lb`;
}

function formatDuration(s: number | null) {
  if (!s) return "—";
  return `${Math.floor(s / 60)} min`;
}

function buildGrid() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364 - start.getDay());
  const weeks: Date[][] = [];
  const current = new Date(start);
  while (current <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(current)); current.setDate(current.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

function cellColor(day: Date, dayMap: Record<string, DayData>, today: Date) {
  if (day > today) return "bg-gray-50";
  const key = day.toISOString().slice(0, 10);
  const data = dayMap[key];
  if (!data) return "bg-gray-100";
  if (data.volume > 5000) return "bg-green-700";
  if (data.volume > 2000) return "bg-green-500";
  if (data.volume > 500)  return "bg-green-400";
  return "bg-green-300";
}

function Heatmap({ dayMap }: { dayMap: Record<string, DayData> }) {
  const weeks = buildGrid();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, i) => {
    if (i === 0 || week[0].getMonth() !== weeks[i - 1][0].getMonth())
      monthLabels.push({ label: MONTHS[week[0].getMonth()], col: i });
  });
  return (
    <div className="relative select-none">
      <div className="flex mb-1 ml-8">
        {weeks.map((_, i) => {
          const label = monthLabels.find((m) => m.col === i);
          return <div key={i} className="w-3 shrink-0 mr-0.5 text-xs text-gray-400 leading-none">{label ? label.label : ""}</div>;
        })}
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1 w-7">
          {DAYS.map((d, i) => (
            <div key={d} className="h-3 text-xs text-gray-400 leading-none flex items-center">{i % 2 === 1 ? d : ""}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => {
              const key = day.toISOString().slice(0, 10);
              const data = dayMap[key];
              return (
                <div
                  key={di}
                  className={`h-3 w-3 rounded-sm cursor-default hover:opacity-70 transition-opacity ${cellColor(day, dayMap, today)}`}
                  onMouseEnter={(e) => {
                    const text = data ? `${key} · ${data.count} session${data.count > 1 ? "s" : ""} · ${formatVolume(data.volume)}` : key;
                    setTooltip({ text, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-xs text-gray-400">Less</span>
        {["bg-gray-100","bg-green-300","bg-green-400","bg-green-500","bg-green-700"].map((c) => (
          <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-gray-400">More</span>
      </div>
      {tooltip && (
        <div className="fixed z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap" style={{ left: tooltip.x, top: tooltip.y - 32 }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function ExerciseChart({ prs }: { prs: Stats["prs"] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [metric, setMetric] = useState<"maxWeight" | "totalVolume">("maxWeight");

  useEffect(() => {
    if (!selectedId) return;
    setLoadingHistory(true);
    fetch(`/api/workout/exercises/${selectedId}/history`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [selectedId]);

  const selected = prs.find((p) => p.exerciseId === selectedId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exercise Progress</CardTitle>
        <CardDescription>Weight or volume over time for any exercise</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm flex-1 min-w-0"
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
          >
            <option value="">Select an exercise...</option>
            {prs.map((pr) => (
              <option key={pr.exerciseId} value={pr.exerciseId}>{pr.exerciseName}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <Button size="sm" variant={metric === "maxWeight" ? "default" : "outline"} onClick={() => setMetric("maxWeight")}>Weight</Button>
            <Button size="sm" variant={metric === "totalVolume" ? "default" : "outline"} onClick={() => setMetric("totalVolume")}>Volume</Button>
          </div>
        </div>

        {!selectedId ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            Select an exercise above to see its history
          </div>
        ) : loadingHistory ? (
          <Skeleton className="h-40 w-full" />
        ) : history.length < 2 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            Not enough data yet (need 2+ sessions)
          </div>
        ) : (
          <div>
            {selected && (
              <p className="text-xs text-gray-500 mb-2">
                All-time best: <strong>{selected.maxWeight} lb × {selected.maxReps} reps</strong>
              </p>
            )}
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [metric === "maxWeight" ? `${v} lb` : formatVolume(Number(v)), metric === "maxWeight" ? "Max Weight" : "Volume"]}
                  labelFormatter={(l) => new Date(l).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#6366f1" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MuscleGroupChart({ muscleGroupVolume }: { muscleGroupVolume: Record<string, number> }) {
  const data = Object.entries(muscleGroupVolume)
    .map(([group, volume]) => ({
      group: group.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      volume: Math.round(volume),
      key: group,
    }))
    .sort((a, b) => b.volume - a.volume);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Volume by Muscle Group</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 py-4 text-center">No data for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume by Muscle Group</CardTitle>
        <CardDescription>Total volume lifted per muscle group this period</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => formatVolume(v)} />
            <YAxis type="category" dataKey="group" tick={{ fontSize: 11, fill: "#374151" }} width={90} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [formatVolume(Number(v)), "Volume"]}
            />
            <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={MUSCLE_COLORS[entry.key] ?? "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  async function deleteSession(id: string) {
    const res = await fetch(`/api/workout/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStats((prev) => prev ? {
        ...prev,
        recentSessions: prev.recentSessions.filter((s) => s.id !== id),
        sessionCount: prev.sessionCount - 1,
      } : prev);
      toast.success("Session deleted.");
    } else {
      toast.error("Failed to delete session.");
    }
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workout/stats?days=${days}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const sessionTrend = stats && stats.prevSessionCount > 0
    ? Math.round(((stats.sessionCount - stats.prevSessionCount) / stats.prevSessionCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-sm text-gray-500 mt-1">Volume, frequency, and personal records.</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button key={p} variant={days === p ? "default" : "outline"} size="sm" onClick={() => setDays(p)}>
              {p}d
            </Button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Activity</CardTitle>
          <CardDescription>Past year — hover a square for details</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-4">
          {loading ? <Skeleton className="h-24 w-full" /> : <Heatmap dayMap={stats?.dayMap ?? {}} />}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Sessions</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.sessionCount ?? 0}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{stats?.sessionsPerWeek ?? 0}/week</span>
                  <TrendBadge trend={sessionTrend} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Volume</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatVolume(stats?.totalVolume ?? 0)}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">vs. prior period</span>
                  <TrendBadge trend={stats?.volumeTrend ?? 0} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> Current Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.currentStreak ?? 0} <span className="text-sm font-normal text-gray-500">days</span></div>
                <p className="text-xs text-gray-500 mt-1">Best: {stats?.longestStreak ?? 0} days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">PRs Tracked</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.prs.length ?? 0}</div>
                <p className="text-xs text-gray-500 mt-1">Exercises with history</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Exercise Chart + Muscle Group Volume */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          <>
            <ExerciseChart prs={stats?.prs ?? []} />
            <MuscleGroupChart muscleGroupVolume={stats?.muscleGroupVolume ?? {}} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Personal Records
            </CardTitle>
            <CardDescription>Best lift per exercise, all time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : stats?.prs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No PRs yet. Log some workouts!</p>
            ) : (
              <div className="divide-y">
                {stats?.prs.slice(0, 10).map((pr) => (
                  <div key={pr.exerciseName} className="flex items-center justify-between py-2.5">
                    <span className="text-sm">{pr.exerciseName}</span>
                    <div>
                      <span className="text-sm font-semibold">{pr.maxWeight} lb</span>
                      <span className="text-xs text-gray-400 ml-1">× {pr.maxReps}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : stats?.recentSessions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No sessions in this period.</p>
            ) : (
              <div className="divide-y">
                {stats?.recentSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3 group">
                    <div>
                      <p className="text-sm font-medium">{s.name ?? "Workout"}</p>
                      <p className="text-xs text-gray-400">{new Date(s.startedAt).toLocaleDateString()} · {s.exerciseCount} exercises</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium">{formatVolume(s.volume)}</p>
                        <p className="text-xs text-gray-400">{formatDuration(s.durationSeconds)}</p>
                      </div>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
