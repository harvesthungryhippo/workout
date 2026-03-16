"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

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

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [equipFilter, setEquipFilter] = useState("All");

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exercise Library</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and search all available exercises.</p>
        </div>
        <Button size="sm" className="gap-2">
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
            <Badge
              key={m}
              variant={muscleFilter === m ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setMuscleFilter(m)}
            >
              {muscleLabel(m)}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => (
            <Badge
              key={e}
              variant={equipFilter === e ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setEquipFilter(e)}
            >
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
                        {ex.instructions && (
                          <p className="text-xs text-gray-400 mt-0.5">{ex.instructions}</p>
                        )}
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
