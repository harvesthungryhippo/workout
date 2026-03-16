"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Timer, Plus, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number | null;
  weightKg: string | null;
  completed: boolean;
}

interface SessionExercise {
  id: string;
  order: number;
  notes: string | null;
  exercise: { id: string; name: string; muscleGroup: string };
  sets: WorkoutSet[];
  restSeconds?: number;
}

interface Session {
  id: string;
  name: string | null;
  startedAt: string;
  completedAt: string | null;
  exercises: SessionExercise[];
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((s: number) => {
    setSeconds(s);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSeconds(0);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) { setRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  return { seconds, running, start, stop };
}

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LogWorkoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programDayId = searchParams.get("programDayId") ?? undefined;
  const programId = searchParams.get("programId") ?? undefined;
  const sessionName = searchParams.get("name") ?? undefined;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [setInputs, setSetInputs] = useState<Record<string, { reps: string; weight: string }>>({});
  const timer = useTimer();
  const [timerLabel, setTimerLabel] = useState("");
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => { sessionRef.current = session; }, [session]);

  // Start session on mount
  useEffect(() => {
    fetch("/api/workout/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sessionName, programId, programDayId }),
    })
      .then((r) => r.json())
      .then((s) => { setSession(s); initInputs(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initInputs(s: Session) {
    const inputs: Record<string, { reps: string; weight: string }> = {};
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        inputs[`${ex.id}-${set.setNumber}`] = {
          reps: set.reps?.toString() ?? "",
          weight: set.weightKg?.toString() ?? "",
        };
      }
    }
    setSetInputs(inputs);
  }

  function setKey(exId: string, setNum: number) {
    return `${exId}-${setNum}`;
  }

  async function completeSet(ex: SessionExercise, set: WorkoutSet) {
    if (!session) return;
    const key = setKey(ex.id, set.setNumber);
    const input = setInputs[key] ?? { reps: "", weight: "" };

    const res = await fetch(
      `/api/workout/sessions/${session.id}/exercises/${ex.id}/sets`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setNumber: set.setNumber,
          reps: parseInt(input.reps) || undefined,
          weightKg: parseFloat(input.weight) || undefined,
          completed: true,
        }),
      }
    );

    if (res.ok) {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((e) =>
            e.id !== ex.id
              ? e
              : {
                  ...e,
                  sets: e.sets.map((s2) =>
                    s2.setNumber !== set.setNumber ? s2 : { ...s2, completed: true }
                  ),
                }
          ),
        };
      });
      // Start rest timer
      const restSec = ex.restSeconds ?? 90;
      timer.start(restSec);
      setTimerLabel(`Rest: ${ex.exercise.name}`);
    }
  }

  async function finishSession() {
    if (!session) return;
    setCompleting(true);
    const durationSeconds = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    const res = await fetch(`/api/workout/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: new Date().toISOString(), durationSeconds }),
    });
    if (res.ok) {
      toast.success("Session complete!");
      router.push("/workout");
    }
    setCompleting(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) return <p className="text-sm text-gray-500">Could not start session.</p>;

  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);
  const completedSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/workout" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{session.name ?? "Workout"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {completedSets}/{totalSets} sets completed
          </p>
        </div>
        <Button onClick={finishSession} disabled={completing} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {completing ? "Saving..." : "Finish"}
        </Button>
      </div>

      {/* Rest Timer */}
      {timer.running && (
        <Card className="bg-gray-900 text-white">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">{timerLabel}</p>
                <p className="text-2xl font-bold tabular-nums">
                  {Math.floor(timer.seconds / 60)}:{String(timer.seconds % 60).padStart(2, "0")}
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-white hover:text-gray-300" onClick={timer.stop}>
              Skip
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Exercises */}
      {session.exercises.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-400">No exercises loaded. This was a free session — log manually after.</p>
          </CardContent>
        </Card>
      )}

      {session.exercises.map((ex) => {
        const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
        return (
          <Card key={ex.id} className={allDone ? "opacity-75" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {ex.exercise.name}
                  {allDone && <Badge className="text-xs gap-1"><Check className="h-3 w-3" />Done</Badge>}
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">{muscleLabel(ex.exercise.muscleGroup)}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 mb-2 px-1">
                <span>Set</span><span>Reps</span><span>Weight (kg)</span><span></span>
              </div>
              <div className="space-y-2">
                {ex.sets.map((set) => {
                  const key = setKey(ex.id, set.setNumber);
                  const input = setInputs[key] ?? { reps: "", weight: "" };
                  return (
                    <div key={set.setNumber} className={`grid grid-cols-4 gap-2 items-center ${set.completed ? "opacity-50" : ""}`}>
                      <span className="text-sm font-medium tabular-nums">{set.setNumber}</span>
                      <Input
                        type="number"
                        placeholder="reps"
                        value={input.reps}
                        disabled={set.completed}
                        onChange={(e) =>
                          setSetInputs((prev) => ({ ...prev, [key]: { ...input, reps: e.target.value } }))
                        }
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="kg"
                        value={input.weight}
                        disabled={set.completed}
                        onChange={(e) =>
                          setSetInputs((prev) => ({ ...prev, [key]: { ...input, weight: e.target.value } }))
                        }
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant={set.completed ? "secondary" : "default"}
                        className="h-8 w-full"
                        disabled={set.completed}
                        onClick={() => completeSet(ex, set)}
                      >
                        {set.completed ? <Check className="h-4 w-4" /> : "Done"}
                      </Button>
                    </div>
                  );
                })}
              </div>
              {ex.notes && (
                <p className="text-xs text-gray-400 mt-3 border-t pt-2">{ex.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add exercise */}
      <Button variant="outline" className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Add Exercise
      </Button>

      <div className="pb-8">
        <Button onClick={finishSession} disabled={completing} className="w-full gap-2" size="lg">
          <CheckCircle2 className="h-4 w-4" />
          {completing ? "Saving..." : "Finish Session"}
        </Button>
      </div>
    </div>
  );
}
