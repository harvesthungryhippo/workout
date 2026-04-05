"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Dumbbell, BarChart2, MessageSquare, TrendingUp, Flame, Building2 } from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Stats {
  totalUsers: number;
  activeUsers30d: number;
  activeUsers7d: number;
  totalSessions: number;
  totalSets: number;
  feedbackByStatus: Record<string, number>;
  topExercises: { id: string; name: string; muscleGroup: string; count: number }[];
  sessionsPerDay: { date: string; count: number }[];
  newUsersPerDay: { date: string; count: number }[];
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950 p-2">
            <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 dark:text-gray-400">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const totalFeedback = stats ? Object.values(stats.feedbackByStatus).reduce((a, b) => a + b, 0) : 0;
  const openFeedback = stats?.feedbackByStatus["OPEN"] ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">App usage and feedback overview.</p>
      </div>

      {/* Navigation row */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/feedback">
          <div className="relative">
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </button>
            {!loading && openFeedback > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {openFeedback > 9 ? "9+" : openFeedback}
              </span>
            )}
          </div>
        </Link>
        <Link href="/admin/organizations">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Building2 className="h-4 w-4" />
            Organizations
          </button>
        </Link>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard icon={Users}     label="Total Users"         value={stats.totalUsers} />
          <StatCard icon={Flame}     label="Active (7d)"         value={stats.activeUsers7d}  sub={`${stats.activeUsers30d} in last 30d`} />
          <StatCard icon={Dumbbell}  label="Total Sessions"      value={stats.totalSessions.toLocaleString()} />
          <StatCard icon={BarChart2} label="Completed Sets"      value={stats.totalSets.toLocaleString()} />
          <StatCard icon={TrendingUp} label="Avg Sessions/User"  value={(stats.totalUsers > 0 ? (stats.totalSessions / stats.totalUsers).toFixed(1) : "0")} />
          <StatCard icon={MessageSquare} label="Feedback"        value={totalFeedback} sub={`${openFeedback} open`} />
        </div>
      ) : null}

      {/* Sessions chart */}
      {stats && stats.sessionsPerDay.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sessions per Day (last 30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.sessionsPerDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(v) => `Date: ${v}`}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top exercises */}
      {stats && stats.topExercises.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top 10 Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topExercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-gray-400 tabular-nums text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{ex.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{ex.count.toLocaleString()} sets</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${(ex.count / stats.topExercises[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
