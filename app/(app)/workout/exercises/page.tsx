"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  instructions: string | null;
}

const MUSCLE_GROUPS = [
  "All", "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS",
  "CORE", "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "FULL_BODY",
];

const EQUIPMENT = ["All", "BARBELL", "DUMBBELL", "CABLE", "MACHINE", "BODYWEIGHT", "KETTLEBELL", "BANDS"];
const CATEGORIES = ["STRENGTH", "BODYWEIGHT", "CARDIO", "FLEXIBILITY"];

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function AddExerciseModal({ onClose, onAdded }: { onClose: () => void; onAdded: (ex: Exercise) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("STRENGTH");
  const [muscleGroup, setMuscleGroup] = useState("CHEST");
  const [equipment, setEquipment] = useState("BARBELL");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/workout/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), category, muscleGroup, equipment, instructions: instructions.trim() || undefined }),
    });
    if (res.ok) {
      const ex = await res.json();
      toast.success("Exercise added.");
      onAdded(ex);
      onClose();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to add exercise.");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Exercise</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Fly" autoFocus required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {CATEGORIES.map((c) => <option key={c} value={c}>{muscleLabel(c)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Muscle Group</Label>
              <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {MUSCLE_GROUPS.filter(m => m !== "All").map((m) => <option key={m} value={m}>{muscleLabel(m)}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Equipment</Label>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              {EQUIPMENT.filter(e => e !== "All").map((e) => <option key={e} value={e}>{muscleLabel(e)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Brief description" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Exercise"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [equipFilter, setEquipFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (muscleFilter !== "All") params.set("muscleGroup", muscleFilter);
    if (equipFilter !== "All") params.set("equipment", equipFilter);

    setLoading(true);
    fetch(`/api/workout/exercises?${params}`)
      .then((r) => r.json())
      .then((d) => setExercises(d.exercises ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, muscleFilter, equipFilter]);

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const key = ex.muscleGroup;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {showModal && (
        <AddExerciseModal
          onClose={() => setShowModal(false)}
          onAdded={(ex) => setExercises((prev) => [...prev, ex])}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exercise Library</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and search all available exercises.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((m) => (
            <Badge key={m} variant={muscleFilter === m ? "default" : "secondary"} className="cursor-pointer" onClick={() => setMuscleFilter(m)}>
              {muscleLabel(m)}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => (
            <Badge key={e} variant={equipFilter === e ? "default" : "secondary"} className="cursor-pointer" onClick={() => setEquipFilter(e)}>
              {muscleLabel(e)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-400">No exercises found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([muscle, exs]) => (
            <Card key={muscle}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">{muscleLabel(muscle)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {exs.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{ex.name}</p>
                        {ex.instructions && <p className="text-xs text-gray-400 mt-0.5">{ex.instructions}</p>}
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <Badge variant="secondary" className="text-xs">{muscleLabel(ex.equipment)}</Badge>
                        <Badge variant="outline" className="text-xs">{muscleLabel(ex.category)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
