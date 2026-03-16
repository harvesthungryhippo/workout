"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";

interface Stats {
  period: { days: number };
  sessionCount: number;
  prevSessionCount: number;
  sessionsPerWeek: number;
  prevSessionsPerWeek: number;
  totalVolume: number;
  prevVolume: number;
  volumeTrend: number;
  prs: { exerciseName: string; maxWeight: number; maxReps: number; maxVolume: number }[];
  recentSessions: {
    id: string;
    name: string | null;
    startedAt: string;
    completedAt: string | null;
    durationSeconds: number | null;
    exerciseCount: number;
    volume: number;
  }[];
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) return <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100"><TrendingUp className="h-3 w-3" />+{trend}%</Badge>;
  if (trend < 0) return <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100"><TrendingDown className="h-3 w-3" />{trend}%</Badge>;
  return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />Flat</Badge>;
}

function formatVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString()} kg`;
}

function formatDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return `${m} min`;
}

const PERIODS = [7, 30, 90];

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workout/stats?days=${days}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const sessionTrend = stats
    ? stats.prevSessionCount > 0
      ? Math.round(((stats.sessionCount - stats.prevSessionCount) / stats.prevSessionCount) * 100)
      : 0
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
            <Button
              key={p}
              variant={days === p ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(p)}
            >
              {p}d
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.sessionCount ?? 0}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{stats?.sessionsPerWeek ?? 0}/week</span>
                  <TrendBadge trend={sessionTrend} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Volume</CardTitle>
              </CardHeader>
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
                <CardTitle className="text-sm font-medium text-gray-500">PRs Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.prs.length ?? 0}</div>
                <p className="text-xs text-gray-500 mt-1">Exercises with history</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PRs */}
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
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : stats?.prs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No PRs yet. Log some workouts!</p>
            ) : (
              <div className="divide-y">
                {stats?.prs.slice(0, 10).map((pr) => (
                  <div key={pr.exerciseName} className="flex items-center justify-between py-2.5">
                    <span className="text-sm">{pr.exerciseName}</span>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-sm font-semibold">{pr.maxWeight} kg</span>
                        <span className="text-xs text-gray-400 ml-1">× {pr.maxReps}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : stats?.recentSessions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No sessions in this period.</p>
            ) : (
              <div className="divide-y">
                {stats?.recentSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{s.name ?? "Workout"}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.startedAt).toLocaleDateString()} · {s.exerciseCount} exercises
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{formatVolume(s.volume)}</p>
                      <p className="text-xs text-gray-400">{formatDuration(s.durationSeconds)}</p>
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
