"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface ProgramExerciseInput {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
}

interface DayInput {
  dayNumber: number;
  name: string;
  exercises: ProgramExerciseInput[];
}

export default function NewProgramPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [setActive, setSetActive] = useState(true);
  const [days, setDays] = useState<DayInput[]>([{ dayNumber: 1, name: "Day 1", exercises: [] }]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workout/exercises")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setExercises(d.exercises ?? []); })
      .catch(console.error);
  }, []);

  function addDay() {
    setDays((prev) => [
      ...prev,
      { dayNumber: prev.length + 1, name: `Day ${prev.length + 1}`, exercises: [] },
    ]);
  }

  function removeDay(index: number) {
    setDays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  }

  function updateDay(index: number, field: keyof DayInput, value: string | number) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function addExerciseToDay(dayIndex: number, ex: Exercise) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex
          ? d
          : {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  exerciseId: ex.id,
                  exerciseName: ex.name,
                  order: d.exercises.length + 1,
                  sets: 3,
                  reps: "8-12",
                  restSeconds: 90,
                  notes: "",
                },
              ],
            }
      )
    );
  }

  function updateExercise(dayIndex: number, exIndex: number, field: string, value: string | number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e, j) => (j !== exIndex ? e : { ...e, [field]: value })),
            }
      )
    );
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex
          ? d
          : { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex).map((e, j) => ({ ...e, order: j + 1 })) }
      )
    );
  }

  async function save() {
    if (!name.trim()) { toast.error("Program name required."); return; }
    setSaving(true);
    const res = await fetch("/api/workout/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        daysPerWeek,
        durationWeeks,
        active: setActive,
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          name: d.name,
          exercises: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            notes: e.notes || undefined,
          })),
        })),
      }),
    });

    if (res.ok) {
      toast.success("Program created!");
      router.push("/workout/programs");
    } else {
      toast.error("Failed to create program.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/workout/programs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to programs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Program</h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Program Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PPL Hypertrophy Block" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Days per week</Label>
              <Input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(parseInt(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (weeks)</Label>
              <Input type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(parseInt(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={setActive} onChange={(e) => setSetActive(e.target.checked)} />
            Set as active program
          </label>
        </CardContent>
      </Card>

      {/* Days */}
      {days.map((day, dayIndex) => (
        <Card key={dayIndex}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-gray-500 w-14 shrink-0">Day {day.dayNumber}</span>
              <Input
                value={day.name}
                onChange={(e) => updateDay(dayIndex, "name", e.target.value)}
                className="h-8 max-w-48"
                placeholder="e.g. Push"
              />
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => removeDay(dayIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {day.exercises.map((ex, exIndex) => (
              <div key={exIndex} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{ex.exerciseName}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400" onClick={() => removeExercise(dayIndex, exIndex)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Sets</Label>
                    <Input type="number" min={1} value={ex.sets} onChange={(e) => updateExercise(dayIndex, exIndex, "sets", parseInt(e.target.value))} className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reps</Label>
                    <Input value={ex.reps} onChange={(e) => updateExercise(dayIndex, exIndex, "reps", e.target.value)} className="h-7 text-sm" placeholder="8-12" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rest (sec)</Label>
                    <Input type="number" min={0} value={ex.restSeconds} onChange={(e) => updateExercise(dayIndex, exIndex, "restSeconds", parseInt(e.target.value))} className="h-7 text-sm" />
                  </div>
                </div>
              </div>
            ))}

            {/* Add exercise picker */}
            <details className="group">
              <summary className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-700 list-none">
                <Plus className="h-4 w-4" />
                Add exercise
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg divide-y">
                {exercises.map((ex) => (
                  <button
                    key={ex.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => addExerciseToDay(dayIndex, ex)}
                  >
                    <span>{ex.name}</span>
                    <Badge variant="secondary" className="text-xs">{ex.muscleGroup.replace(/_/g, " ")}</Badge>
                  </button>
                ))}
              </div>
            </details>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addDay} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Day
      </Button>

      <div className="flex justify-end gap-3 pb-8">
        <Link href="/workout/programs"><Button variant="outline">Cancel</Button></Link>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Create Program"}</Button>
      </div>
    </div>
  );
}
