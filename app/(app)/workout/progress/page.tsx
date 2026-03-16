"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DayData { count: number; volume: number; }

interface Stats {
  period: { days: number };
  sessionCount: number;
  prevSessionCount: number;
  sessionsPerWeek: number;
  totalVolume: number;
  prevVolume: number;
  volumeTrend: number;
  prs: { exerciseName: string; maxWeight: number; maxReps: number; maxVolume: number }[];
  recentSessions: {
    id: string; name: string | null; startedAt: string;
    completedAt: string | null; durationSeconds: number | null;
    exerciseCount: number; volume: number;
  }[];
  dayMap: Record<string, DayData>;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PERIODS = [7, 30, 90];

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
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, i) => {
    if (i === 0 || week[0].getMonth() !== weeks[i - 1][0].getMonth()) {
      monthLabels.push({ label: MONTHS[week[0].getMonth()], col: i });
    }
  });

  return (
    <div className="relative select-none">
      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {weeks.map((_, i) => {
          const label = monthLabels.find((m) => m.col === i);
          return (
            <div key={i} className="w-3 shrink-0 mr-0.5 text-xs text-gray-400 leading-none">
              {label ? label.label : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 w-7">
          {DAYS.map((d, i) => (
            <div key={d} className="h-3 text-xs text-gray-400 leading-none flex items-center">
              {i % 2 === 1 ? d : ""}
            </div>
          ))}
        </div>

        {/* Grid */}
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
                    const text = data
                      ? `${key} · ${data.count} session${data.count > 1 ? "s" : ""} · ${formatVolume(data.volume)}`
                      : key;
                    setTooltip({ text, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-xs text-gray-400">Less</span>
        {["bg-gray-100","bg-green-300","bg-green-400","bg-green-500","bg-green-700"].map((c) => (
          <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-gray-400">More</span>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y - 32 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
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
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">PRs Tracked</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.prs.length ?? 0}</div>
                <p className="text-xs text-gray-500 mt-1">Exercises with history</p>
              </CardContent>
            </Card>
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
