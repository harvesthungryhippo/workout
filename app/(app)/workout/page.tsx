"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dumbbell, TrendingUp, Calendar, Flame, Plus, Play, Target } from "lucide-react";
import Link from "next/link";

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

export default function WorkoutPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workout/stats?days=30").then((r) => r.json()),
      fetch("/api/workout/programs").then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setStats(s);
        const active = p.programs?.find((prog: ActiveProgram & { active: boolean }) => prog.active) ?? null;
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
        <Link href="/workout/log">
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Start Session
          </Button>
        </Link>
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
                        {new Date(s.startedAt).toLocaleDateString()} · {s.exerciseCount} exercises
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

        {/* Weekly Summary */}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sessions</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Last week: {stats?.weekly.lastSessions ?? 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stats?.weekly.thisSessions ?? 0}</p>
                    {(stats?.weekly.lastSessions ?? 0) > 0 && (
                      <p className={`text-xs font-medium ${(stats?.weekly.thisSessions ?? 0) >= (stats?.weekly.lastSessions ?? 0) ? "text-green-600" : "text-red-500"}`}>
                        {(stats?.weekly.thisSessions ?? 0) >= (stats?.weekly.lastSessions ?? 0) ? "+" : ""}
                        {(stats?.weekly.thisSessions ?? 0) - (stats?.weekly.lastSessions ?? 0)} vs last
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <p className="text-sm font-medium">Volume</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Last week: {formatVolume(stats?.weekly.lastVolume ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatVolume(stats?.weekly.thisVolume ?? 0)}</p>
                    {(stats?.weekly.lastVolume ?? 0) > 0 && (
                      <p className={`text-xs font-medium ${(stats?.weekly.thisVolume ?? 0) >= (stats?.weekly.lastVolume ?? 0) ? "text-green-600" : "text-red-500"}`}>
                        {(stats?.weekly.thisVolume ?? 0) >= (stats?.weekly.lastVolume ?? 0) ? "+" : ""}
                        {Math.round(((stats?.weekly.thisVolume ?? 0) - (stats?.weekly.lastVolume ?? 0)) / Math.max(stats?.weekly.lastVolume ?? 1, 1) * 100)}% vs last
                      </p>
                    )}
                  </div>
                </div>
                <Link href="/workout/goals" className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mt-2">
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

      {/* Active Program */}
      {!loading && activeProgram && (
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
            <div className="flex flex-wrap gap-2">
              {activeProgram.days.map((day) => (
                <Link key={day.id} href={`/workout/log?programDayId=${day.id}&programId=${activeProgram.id}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 transition-colors px-3 py-1.5">
                    Day {day.dayNumber}: {day.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No program CTA */}
      {!loading && !activeProgram && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
            <Dumbbell className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No active program. Create one to follow a structured plan.</p>
            <Link href="/workout/programs">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Program
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
