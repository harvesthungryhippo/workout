"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface Exercise { id: string; name: string }
interface Goal {
  id: string;
  name: string;
  exerciseId: string | null;
  exercise: Exercise | null;
  targetValue: string;
  unit: string;
  deadline: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface PR { exerciseName: string; exerciseId: string; maxWeight: number; maxReps: number }

const UNITS = [
  { value: "lb",         label: "Max Weight (lb)" },
  { value: "reps",       label: "Max Reps" },
  { value: "sessions",   label: "Sessions logged" },
  { value: "volume_lb",  label: "Total Volume (lb)" },
];

const EMPTY_FORM = {
  name: "", exerciseId: "", targetValue: "", unit: "lb", deadline: "", notes: "",
};

function progressToward(goal: Goal, prs: PR[], sessionCount: number, totalVolume: number): number | null {
  if (goal.unit === "sessions") {
    return Math.min(100, Math.round((sessionCount / parseFloat(goal.targetValue)) * 100));
  }
  if (goal.unit === "volume_lb") {
    return Math.min(100, Math.round((totalVolume / parseFloat(goal.targetValue)) * 100));
  }
  if (goal.exerciseId) {
    const pr = prs.find((p) => p.exerciseId === goal.exerciseId);
    if (!pr) return null;
    const current = goal.unit === "lb" ? pr.maxWeight : pr.maxReps;
    return Math.min(100, Math.round((current / parseFloat(goal.targetValue)) * 100));
  }
  return null;
}

function currentValue(goal: Goal, prs: PR[], sessionCount: number, totalVolume: number): string {
  if (goal.unit === "sessions") return `${sessionCount}`;
  if (goal.unit === "volume_lb") return `${totalVolume.toLocaleString()} lb`;
  if (goal.exerciseId) {
    const pr = prs.find((p) => p.exerciseId === goal.exerciseId);
    if (!pr) return "No data";
    return goal.unit === "lb" ? `${pr.maxWeight} lb` : `${pr.maxReps} reps`;
  }
  return "—";
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/workout/goals").then((r) => r.json()),
      fetch("/api/workout/stats?days=3650").then((r) => r.json()),
      fetch("/api/workout/exercises").then((r) => r.json()),
    ]).then(([g, s, e]) => {
      setGoals(g);
      setPrs(s.prs ?? []);
      setSessionCount(s.sessionCount ?? 0);
      setTotalVolume(s.totalVolume ?? 0);
      setExercises(e.exercises ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function save() {
    if (!form.name || !form.targetValue) {
      toast.error("Name and target are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/workout/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        exerciseId: form.exerciseId || null,
        targetValue: parseFloat(form.targetValue),
        unit: form.unit,
        deadline: form.deadline || null,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      const g = await res.json();
      setGoals((prev) => [g, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Goal created!");
    }
    setSaving(false);
  }

  async function toggleComplete(goal: Goal) {
    const completedAt = goal.completedAt ? null : new Date().toISOString();
    const res = await fetch(`/api/workout/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt }),
    });
    if (res.ok) {
      setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, completedAt } : g));
    }
  }

  async function deleteGoal(id: string) {
    const res = await fetch(`/api/workout/goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success("Goal deleted.");
    }
  }

  const active = goals.filter((g) => !g.completedAt);
  const completed = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Set targets and track your progress toward them.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Goal
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Goal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Goal name</Label>
                <Input placeholder='e.g. "Bench press 225 lb"' value={form.name} onChange={field("name")} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={form.unit}
                  onChange={field("unit")}
                >
                  {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              {(form.unit === "lb" || form.unit === "reps") && (
                <div className="space-y-1">
                  <Label>Exercise</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={form.exerciseId}
                    onChange={field("exerciseId")}
                  >
                    <option value="">Select exercise...</option>
                    {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Target value</Label>
                <Input type="number" placeholder="e.g. 225" value={form.targetValue} onChange={field("targetValue")} />
              </div>
              <div className="space-y-1">
                <Label>Deadline (optional)</Label>
                <Input type="date" value={form.deadline} onChange={field("deadline")} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notes (optional)</Label>
                <Input placeholder="Any extra context..." value={form.notes} onChange={field("notes")} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Goal"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : active.length === 0 && !showForm ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-400">No active goals. Create one to start tracking!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((goal) => {
            const pct = progressToward(goal, prs, sessionCount, totalVolume);
            const curr = currentValue(goal, prs, sessionCount, totalVolume);
            const daysLeft = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            return (
              <Card key={goal.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => toggleComplete(goal)}>
                          <Circle className="h-4 w-4 text-gray-300 hover:text-green-500 transition-colors" />
                        </button>
                        <p className="text-sm font-semibold truncate">{goal.name}</p>
                        {goal.exercise && <Badge variant="secondary" className="text-xs shrink-0">{goal.exercise.name}</Badge>}
                        {daysLeft !== null && (
                          <Badge
                            variant="secondary"
                            className={`text-xs shrink-0 ${daysLeft < 14 ? "bg-red-100 text-red-700" : ""}`}
                          >
                            {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-2 ml-6">
                        <span className="text-xs text-gray-500">{curr} / {goal.targetValue} {goal.unit === "lb" ? "lb" : goal.unit === "reps" ? "reps" : goal.unit === "sessions" ? "sessions" : "lb vol"}</span>
                        {pct !== null && <span className="text-xs font-medium text-gray-700">{pct}%</span>}
                      </div>
                      {pct !== null && (
                        <div className="ml-6 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {goal.notes && <p className="text-xs text-gray-400 mt-2 ml-6 italic">{goal.notes}</p>}
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Completed</h2>
          <div className="space-y-2">
            {completed.map((goal) => (
              <Card key={goal.id} className="opacity-60">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleComplete(goal)}>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </button>
                      <p className="text-sm line-through text-gray-400">{goal.name}</p>
                      <CardDescription className="text-xs">
                        {new Date(goal.completedAt!).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
