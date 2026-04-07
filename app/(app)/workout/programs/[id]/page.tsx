"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";

interface ProgramExercise {
  id: string;
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
  exercise: { id: string; name: string; muscleGroup: string; equipment: string };
}

interface ProgramDay {
  id: string;
  dayNumber: number;
  name: string;
  exercises: ProgramExercise[];
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  durationWeeks: number;
  active: boolean;
  days: ProgramDay[];
}

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRest(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}`;
}

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workout/programs/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setProgram(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!program) return <p className="text-sm text-gray-500">Program not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workout/programs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to programs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{program.name}</h1>
              {program.active && <Badge>Active</Badge>}
            </div>
            {program.description && (
              <p className="text-sm text-gray-500 mt-1">{program.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {program.daysPerWeek} days/week · {program.durationWeeks} weeks
            </p>
          </div>
          <Link href={`/workout/programs/${program.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {program.days.map((day) => (
          <Card key={day.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Day {day.dayNumber}: {day.name}</CardTitle>
                <CardDescription>{day.exercises.length} exercises</CardDescription>
              </div>
              <Link href={`/workout/log?programDayId=${day.id}&programId=${program.id}&name=${encodeURIComponent(day.name)}`}>
                <Button size="sm" className="gap-2">
                  <Play className="h-3.5 w-3.5" />
                  Start
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {day.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{ex.exercise.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {muscleLabel(ex.exercise.muscleGroup)} · {muscleLabel(ex.exercise.equipment)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-right ml-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium">{ex.sets} × {ex.reps}</p>
                        <p className="text-xs text-gray-400">rest {formatRest(ex.restSeconds)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
