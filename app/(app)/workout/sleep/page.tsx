"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface SleepEntry {
  id: string;
  durationMins: number;
  quality: number | null;
  notes: string | null;
  date: string;
}

const QUALITY_LABELS = ["", "Poor", "Fair", "OK", "Good", "Excellent"];
const QUALITY_COLORS = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-green-500", "text-emerald-600"];

export default function SleepPage() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [quality, setQuality] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workout/sleep?limit=30")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const totalMins = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMins <= 0) { toast.error("Enter a valid duration."); return; }
    setSaving(true);
    const res = await fetch("/api/workout/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        durationMins: totalMins,
        quality: quality || undefined,
        notes: notes.trim() || undefined,
        date: new Date(date).toISOString(),
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setHours(""); setMinutes("0"); setQuality(""); setNotes("");
      setShowForm(false);
      toast.success("Sleep logged.");
    } else {
      toast.error("Failed to log sleep.");
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/workout/sleep/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted.");
    }
  }

  const chartData = [...entries].reverse().slice(-14).map((e) => ({
    date: formatDate(e.date, { month: "short", day: "numeric" }),
    hours: +(e.durationMins / 60).toFixed(1),
    quality: e.quality,
  }));

  const avgHours = entries.length
    ? (entries.slice(0, 7).reduce((s, e) => s + e.durationMins, 0) / entries.slice(0, 7).length / 60).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sleep</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track sleep duration and quality.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Log sleep
        </Button>
      </div>

      {/* Stats */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">7-day avg</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{avgHours}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">Last night</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {(entries[0].durationMins / 60).toFixed(1)}h
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {!loading && chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sleep over time</CardTitle>
            <CardDescription>Last 14 entries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 12]} unit="h" />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v) => [`${v}h`, "Sleep"]}
                />
                <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Log sleep</CardTitle>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={addEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Hours</Label>
                  <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="7" min={0} max={24} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Minutes</Label>
                  <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="30" min={0} max={59} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Quality (1-5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(quality === q ? "" : q)}
                      className={`h-9 w-9 rounded-lg border text-sm font-medium transition-colors ${quality === q ? "bg-gray-900 text-white border-gray-900" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      {q}
                    </button>
                  ))}
                  {quality !== "" && <span className={`self-center text-sm font-medium ${QUALITY_COLORS[quality as number]}`}>{QUALITY_LABELS[quality as number]}</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : "Log sleep"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Moon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No sleep entries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="divide-y">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 group">
                  <div>
                    <div className="flex items-center gap-2">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-sm font-medium">{(e.durationMins / 60).toFixed(1)}h</span>
                      {e.quality && (
                        <span className={`text-xs font-medium ${QUALITY_COLORS[e.quality]}`}>
                          {QUALITY_LABELS[e.quality]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.date)}{e.notes && ` · ${e.notes}`}</p>
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
