"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, Dumbbell, CheckSquare, MessageSquare } from "lucide-react";

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

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: number | string; sub?: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!stats) return <p className="text-sm text-red-500">Failed to load stats.</p>;

  const openFeedback = (stats.feedbackByStatus["OPEN"] ?? 0) + (stats.feedbackByStatus["IN_PROGRESS"] ?? 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total users" value={stats.totalUsers} icon={Users} />
        <StatCard label="Active (7d)" value={stats.activeUsers7d} sub={`${stats.activeUsers30d} active last 30d`} icon={Users} />
        <StatCard label="Total sessions" value={stats.totalSessions.toLocaleString()} icon={Dumbbell} />
        <StatCard label="Sets logged" value={stats.totalSets.toLocaleString()} sub={openFeedback > 0 ? `${openFeedback} open feedback` : undefined} icon={CheckSquare} />
      </div>

      {/* Sessions per day */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sessions per day (last 30d)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.sessionsPerDay}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip labelFormatter={(d) => String(d)} />
              <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* New users per day */}
      <Card>
        <CardHeader><CardTitle className="text-base">New signups per day (last 30d)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.newUsersPerDay}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top exercises */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 exercises</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {stats.topExercises.map((ex, i) => (
              <li key={ex.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</p>
                    <p className="text-xs text-gray-400">{ex.muscleGroup?.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{ex.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Feedback summary */}
      {Object.keys(stats.feedbackByStatus).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Feedback by status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {Object.entries(stats.feedbackByStatus).map(([status, count]) => (
                <div key={status}>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs text-gray-400 capitalize">{status.toLowerCase().replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
