"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

interface FitnessTest {
  id: string;
  metric: string;
  value: number;
  unit: string;
  notes: string | null;
  date: string;
}

const METRICS = [
  { key: "vertical_jump",  label: "Vertical Jump",    unit: "inches",  higherBetter: true,  description: "Max standing vertical leap" },
  { key: "pushups",        label: "Push-ups",          unit: "reps",    higherBetter: true,  description: "Max reps without stopping" },
  { key: "pullups",        label: "Pull-ups",          unit: "reps",    higherBetter: true,  description: "Max reps without stopping" },
  { key: "situps",         label: "Sit-ups (60s)",     unit: "reps",    higherBetter: true,  description: "Reps completed in 60 seconds" },
  { key: "plank",          label: "Plank Hold",        unit: "seconds", higherBetter: true,  description: "Time held in plank position" },
  { key: "broad_jump",     label: "Broad Jump",        unit: "inches",  higherBetter: true,  description: "Max standing broad jump distance" },
  { key: "mile_run",       label: "Mile Run",          unit: "seconds", higherBetter: false, description: "Time to run 1 mile" },
  { key: "sprint_40",      label: "40-Yard Dash",      unit: "seconds", higherBetter: false, description: "Time to sprint 40 yards" },
  { key: "burpees",        label: "Burpees (60s)",     unit: "reps",    higherBetter: true,  description: "Reps completed in 60 seconds" },
  { key: "grip_strength",  label: "Grip Strength",     unit: "lbs",     higherBetter: true,  description: "Dominant hand squeeze (lb)" },
  { key: "flexibility",    label: "Sit & Reach",       unit: "inches",  higherBetter: true,  description: "Forward flexibility from seated" },
  { key: "dips",           label: "Dips",              unit: "reps",    higherBetter: true,  description: "Max reps without stopping" },
] as const;

type MetricKey = typeof METRICS[number]["key"];

function formatValue(value: number, unit: string): string {
  if (unit === "seconds" && value >= 60) {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${value} ${unit}`;
}

function TrendIcon({ current, previous, higherBetter }: { current: number; previous: number; higherBetter: boolean }) {
  const improved = higherBetter ? current > previous : current < previous;
  const same = current === previous;
  if (same) return <Minus className="h-3.5 w-3.5 text-gray-400" />;
  if (improved) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
}

export default function FitnessTestsPage() {
  const [tests, setTests] = useState<FitnessTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const [metric, setMetric] = useState<MetricKey>("pushups");
  const [rawValue, setRawValue] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workout/fitness-tests")
      .then((r) => r.ok ? r.json() : [])
      .then(setTests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedMetricDef = METRICS.find((m) => m.key === metric)!;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!rawValue) return;
    setSaving(true);
    // If unit is seconds and input contains ":", convert mm:ss to seconds
    let value = parseFloat(rawValue);
    if (selectedMetricDef.unit === "seconds" && rawValue.includes(":")) {
      const [mins, secs] = rawValue.split(":").map(Number);
      value = (mins || 0) * 60 + (secs || 0);
    }
    if (isNaN(value) || value <= 0) { toast.error("Enter a valid number."); setSaving(false); return; }

    const res = await fetch("/api/workout/fitness-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric, value, unit: selectedMetricDef.unit, notes, date }),
    });
    if (res.ok) {
      const t = await res.json();
      setTests((prev) => [t, ...prev]);
      setRawValue(""); setNotes(""); setShowForm(false);
      toast.success(`${selectedMetricDef.label} logged!`);
    } else {
      toast.error("Failed to save.");
    }
    setSaving(false);
  }

  async function deleteTest(id: string) {
    const res = await fetch(`/api/workout/fitness-tests?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTests((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted.");
    }
  }

  // Group tests by metric, sorted by date desc
  const byMetric = new Map<string, FitnessTest[]>();
  for (const t of tests) {
    if (!byMetric.has(t.metric)) byMetric.set(t.metric, []);
    byMetric.get(t.metric)!.push(t);
  }

  const metricSummaries = METRICS.map((m) => {
    const entries = byMetric.get(m.key) ?? [];
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const best = m.higherBetter
      ? entries.reduce((max, e) => e.value > max ? e.value : max, -Infinity)
      : entries.reduce((min, e) => e.value < min ? e.value : min, Infinity);
    return { ...m, entries: sorted, latest: sorted[0] ?? null, previous: sorted[1] ?? null, best: entries.length > 0 ? best : null };
  });

  const tested = metricSummaries.filter((m) => m.entries.length > 0);
  const untested = metricSummaries.filter((m) => m.entries.length === 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fitness Tests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your baseline athletic metrics over time.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Log result
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log a result</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Metric</Label>
                <select
                  value={metric}
                  onChange={(e) => { setMetric(e.target.value as MetricKey); setRawValue(""); }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400"
                >
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">{selectedMetricDef.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Result ({selectedMetricDef.unit === "seconds" ? "mm:ss or seconds" : selectedMetricDef.unit})
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={selectedMetricDef.unit === "seconds" ? "e.g. 1:45 or 105" : `e.g. 24`}
                    value={rawValue}
                    onChange={(e) => setRawValue(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input placeholder="Conditions, how you felt…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} size="sm">{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tested metrics */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : tested.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-2xl">🏃</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No results yet</p>
            <p className="text-xs text-gray-400">Log your first test above to establish your baseline.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tested.map((m) => {
            const isExpanded = expandedMetric === m.key;
            return (
              <Card key={m.key}>
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedMetric(isExpanded ? null : m.key)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-semibold">{m.label}</CardTitle>
                            <Badge variant="secondary" className="text-xs">{m.entries.length} log{m.entries.length !== 1 ? "s" : ""}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {m.latest ? formatValue(m.latest.value, m.unit) : "—"}
                          </p>
                          <div className="flex items-center justify-end gap-1">
                            {m.latest && m.previous && (
                              <TrendIcon current={m.latest.value} previous={m.previous.value} higherBetter={m.higherBetter} />
                            )}
                            <p className="text-xs text-gray-400">
                              {m.best !== null && m.best !== Infinity && m.best !== -Infinity
                                ? `Best: ${formatValue(m.best, m.unit)}`
                                : "latest"}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {isExpanded && (
                  <CardContent className="pt-0 border-t border-gray-100 dark:border-gray-800">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {m.entries.map((entry, i) => (
                        <div key={entry.id} className="flex items-center justify-between py-2.5 group">
                          <div className="flex items-center gap-3">
                            {i === 0 && m.entries.length > 1 && m.previous && (
                              <TrendIcon current={entry.value} previous={m.entries[1].value} higherBetter={m.higherBetter} />
                            )}
                            <div>
                              <p className="text-sm font-semibold">{formatValue(entry.value, entry.unit)}</p>
                              {entry.notes && <p className="text-xs text-gray-400 italic">{entry.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-gray-400">{formatDate(entry.date, { month: "short", day: "numeric", year: "numeric" })}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteTest(entry.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Untested metrics */}
      {untested.length > 0 && tested.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Not yet tested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {untested.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setMetric(m.key as MetricKey); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  + {m.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
