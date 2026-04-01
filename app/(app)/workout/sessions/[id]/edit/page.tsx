"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save } from "lucide-react";
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
  exercise: { id: string; name: string; muscleGroup: string };
  sets: WorkoutSet[];
}

interface Session {
  id: string;
  name: string | null;
  startedAt: string;
  completedAt: string | null;
  exercises: SessionExercise[];
}

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EditSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputs, setInputs] = useState<Record<string, { reps: string; weight: string }>>({});
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState("");

  useEffect(() => {
    fetch(`/api/workout/sessions/${id}`)
      .then((r) => r.json())
      .then((s: Session) => {
        setSession(s);
        setSessionName(s.name ?? "");
        setSessionDate(new Date(s.startedAt).toISOString().slice(0, 16));
        const init: Record<string, { reps: string; weight: string }> = {};
        for (const ex of s.exercises) {
          for (const set of ex.sets) {
            init[`${ex.id}-${set.setNumber}`] = {
              reps: set.reps?.toString() ?? "",
              weight: set.weightKg?.toString() ?? "",
            };
          }
        }
        setInputs(init);
      })
      .catch(() => toast.error("Failed to load session."))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!session) return;
    setSaving(true);

    try {
      // Update session name/date if changed
      const sessionChanged =
        sessionName !== (session.name ?? "") ||
        sessionDate !== new Date(session.startedAt).toISOString().slice(0, 16);
      if (sessionChanged) {
        await fetch(`/api/workout/sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: sessionName || null,
            startedAt: new Date(sessionDate).toISOString(),
          }),
        });
      }

      // Update all sets
      const patches: Promise<Response>[] = [];
      for (const ex of session.exercises) {
        for (const set of ex.sets) {
          const key = `${ex.id}-${set.setNumber}`;
          const input = inputs[key];
          if (!input) continue;
          patches.push(
            fetch(`/api/workout/sessions/${id}/exercises/${ex.id}/sets`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                setNumber: set.setNumber,
                reps: parseInt(input.reps) || undefined,
                weightKg: parseFloat(input.weight) || undefined,
                completed: true,
              }),
            })
          );
        }
      }

      await Promise.all(patches);
      toast.success("Session updated!");
      router.push("/workout/progress");
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">Session not found.</p>
        <Link href="/workout/progress">
          <Button variant="outline" className="mt-4">Back to Progress</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/workout/progress"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Progress
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Session name"
              className="text-lg font-semibold h-10"
            />
            <input
              type="datetime-local"
              value={sessionDate}
              max={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setSessionDate(e.target.value)}
              className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-500 mt-1"
            />
          </div>
          <Button onClick={save} disabled={saving} className="gap-2 shrink-0">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {session.exercises.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No exercises in this session.</p>
          </CardContent>
        </Card>
      ) : (
        session.exercises.map((ex) => (
          <Card key={ex.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ex.exercise.name}</CardTitle>
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">{muscleLabel(ex.exercise.muscleGroup)}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight (lb)</span>
                <span></span>
              </div>
              <div className="space-y-2">
                {ex.sets.map((set) => {
                  const key = `${ex.id}-${set.setNumber}`;
                  const input = inputs[key] ?? { reps: "", weight: "" };
                  return (
                    <div key={set.setNumber} className="grid grid-cols-4 gap-2 items-center">
                      <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                        {set.setNumber}
                      </span>
                      <Input
                        type="number"
                        placeholder="reps"
                        value={input.reps}
                        onChange={(e) =>
                          setInputs((prev) => ({ ...prev, [key]: { ...input, reps: e.target.value } }))
                        }
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="lb"
                        value={input.weight}
                        onChange={(e) =>
                          setInputs((prev) => ({ ...prev, [key]: { ...input, weight: e.target.value } }))
                        }
                        className="h-8 text-sm"
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {input.reps && input.weight
                          ? `${Math.round(parseFloat(input.weight) * parseInt(input.reps))} lb vol`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <div className="pb-8">
        <Button onClick={save} disabled={saving} className="w-full gap-2" size="lg">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
