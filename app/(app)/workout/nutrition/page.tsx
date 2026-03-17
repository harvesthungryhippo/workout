"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface NutritionEntry {
  id: string;
  mealName: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  notes: string | null;
  date: string;
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmt(n: string | number | null, unit = "") {
  if (n === null || n === undefined) return "—";
  return `${Number(n).toFixed(1)}${unit}`;
}

export default function NutritionPage() {
  const [date, setDate] = useState(toDateString(new Date()));
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workout/nutrition?date=${date}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(toDateString(d));
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!mealName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/workout/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealName: mealName.trim(),
        calories: calories ? parseInt(calories) : undefined,
        proteinG: protein ? parseFloat(protein) : undefined,
        carbsG: carbs ? parseFloat(carbs) : undefined,
        fatG: fat ? parseFloat(fat) : undefined,
        notes: notes.trim() || undefined,
        date: new Date(date).toISOString(),
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setMealName(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); setNotes("");
      setShowForm(false);
      toast.success("Meal logged.");
    } else {
      toast.error("Failed to log meal.");
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/workout/nutrition/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted.");
    } else {
      toast.error("Failed to delete entry.");
    }
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.proteinG ? parseFloat(e.proteinG) : 0),
      carbs: acc.carbs + (e.carbsG ? parseFloat(e.carbsG) : 0),
      fat: acc.fat + (e.fatG ? parseFloat(e.fatG) : 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const isToday = date === toDateString(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nutrition</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track daily calories and macros.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Log meal
        </Button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
        />
        <button
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className="p-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && (
          <button onClick={() => setDate(toDateString(new Date()))} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">Today</button>
        )}
      </div>

      {/* Totals */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Calories", value: `${Math.round(totals.calories)} kcal` },
            { label: "Protein", value: `${totals.protein.toFixed(1)}g` },
            { label: "Carbs", value: `${totals.carbs.toFixed(1)}g` },
            { label: "Fat", value: `${totals.fat.toFixed(1)}g` },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Log meal</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addEntry} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Meal name *</Label>
                <Input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g. Chicken & rice" autoFocus required />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Calories</Label>
                  <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="kcal" min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label>Protein (g)</Label>
                  <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="g" min={0} step={0.1} />
                </div>
                <div className="space-y-1.5">
                  <Label>Carbs (g)</Label>
                  <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="g" min={0} step={0.1} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fat (g)</Label>
                  <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="g" min={0} step={0.1} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : "Log meal"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-400">No meals logged for this day.</p>
            <Button size="sm" className="mt-3 gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Log first meal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="divide-y">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 group">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.mealName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {entry.calories != null && <span>{entry.calories} kcal</span>}
                      {entry.proteinG != null && <span className="ml-2">P: {fmt(entry.proteinG)}g</span>}
                      {entry.carbsG != null && <span className="ml-2">C: {fmt(entry.carbsG)}g</span>}
                      {entry.fatG != null && <span className="ml-2">F: {fmt(entry.fatG)}g</span>}
                    </p>
                    {entry.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{entry.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 ml-4"
                  >
                    <Trash2 className="h-4 w-4" />
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
