"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X, Activity } from "lucide-react";
import { toast } from "sonner";

interface RecoveryEntry {
  id: string;
  overallScore: number | null;
  sorenessAreas: string[];
  notes: string | null;
  date: string;
}

const MUSCLE_AREAS = [
  { key: "CHEST", label: "Chest" },
  { key: "BACK", label: "Back" },
  { key: "SHOULDERS", label: "Shoulders" },
  { key: "BICEPS", label: "Biceps" },
  { key: "TRICEPS", label: "Triceps" },
  { key: "CORE", label: "Core" },
  { key: "QUADS", label: "Quads" },
  { key: "HAMSTRINGS", label: "Hamstrings" },
  { key: "GLUTES", label: "Glutes" },
  { key: "CALVES", label: "Calves" },
];

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Wrecked", color: "text-red-600" },
  2: { label: "Very sore", color: "text-red-500" },
  3: { label: "Sore", color: "text-orange-500" },
  4: { label: "Tired", color: "text-yellow-500" },
  5: { label: "Okay", color: "text-yellow-400" },
  6: { label: "Fair", color: "text-lime-500" },
  7: { label: "Good", color: "text-green-500" },
  8: { label: "Great", color: "text-green-600" },
  9: { label: "Strong", color: "text-emerald-600" },
  10: { label: "Peak", color: "text-emerald-700" },
};

export default function RecoveryPage() {
  const [entries, setEntries] = useState<RecoveryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [score, setScore] = useState<number | "">("");
  const [soreness, setSoreness] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workout/recovery?limit=30")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setEntries(d.entries ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggleArea(key: string) {
    setSoreness((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/workout/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overallScore: score || undefined,
        sorenessAreas: soreness,
        notes: notes.trim() || undefined,
        date: new Date(date).toISOString(),
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setScore(""); setSoreness([]); setNotes("");
      setShowForm(false);
      toast.success("Recovery logged.");
    } else {
      toast.error("Failed to log recovery.");
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/workout/recovery/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted.");
    }
  }

  const avgScore = entries.length
    ? (entries.slice(0, 7).reduce((s, e) => s + (e.overallScore ?? 0), 0) / entries.slice(0, 7).filter(e => e.overallScore).length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recovery</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Log how your body feels and track muscle soreness.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Log recovery
        </Button>
      </div>

      {/* Stats */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">7-day avg score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{avgScore}/10</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500">Today&apos;s score</p>
              <p className={`text-2xl font-bold mt-0.5 ${entries[0].overallScore ? SCORE_LABELS[entries[0].overallScore]?.color : "text-gray-400"}`}>
                {entries[0].overallScore ? `${entries[0].overallScore}/10` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Log recovery</CardTitle>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={addEntry} className="space-y-5">
              <div className="space-y-2">
                <Label>Overall recovery score (1-10)</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(score === n ? "" : n)}
                      className={`h-9 w-9 rounded-lg border text-sm font-medium transition-colors ${score === n ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    >
                      {n}
                    </button>
                  ))}
                  {score !== "" && (
                    <span className={`self-center text-sm font-medium ${SCORE_LABELS[score as number]?.color}`}>
                      {SCORE_LABELS[score as number]?.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sore areas</Label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_AREAS.map(({ key, label }) => (
                    <Badge
                      key={key}
                      variant={soreness.includes(key) ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleArea(key)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : "Log recovery"}</Button>
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
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No recovery entries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="divide-y">
              {entries.map((e) => (
                <div key={e.id} className="py-3 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {e.overallScore && (
                        <div className={`text-lg font-bold ${SCORE_LABELS[e.overallScore]?.color}`}>
                          {e.overallScore}/10
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</p>
                        {e.overallScore && <p className={`text-xs font-medium ${SCORE_LABELS[e.overallScore]?.color}`}>{SCORE_LABELS[e.overallScore]?.label}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {e.sorenessAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {e.sorenessAreas.map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {MUSCLE_AREAS.find((m) => m.key === area)?.label ?? area}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {e.notes && <p className="text-xs text-gray-400 mt-1 italic">{e.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
