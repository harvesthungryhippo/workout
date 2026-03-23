"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TemplateExercise {
  id: string;
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  exercise: { id: string; name: string; muscleGroup: string };
}

interface Template {
  id: string;
  name: string;
  createdAt: string;
  exercises: TemplateExercise[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/workout/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function startRename(t: Template) {
    setRenamingId(t.id);
    setRenameValue(t.name);
    setTimeout(() => renameRef.current?.select(), 0);
  }

  async function submitRename(id: string) {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    const res = await fetch(`/api/workout/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, name } : t));
      toast.success("Template renamed.");
    } else {
      toast.error("Failed to rename.");
    }
    setRenamingId(null);
  }

  async function deleteTemplate(id: string) {
    const res = await fetch(`/api/workout/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted.");
    }
  }

  function startFromTemplate(t: Template) {
    const params = new URLSearchParams({ name: t.name, templateId: t.id });
    router.push(`/workout/log?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Saved workout templates. Create them by finishing a session and saving.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-400">No templates yet.</p>
            <p className="text-xs text-gray-400 mt-1">Finish a workout session and choose "Save as Template" to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {renamingId === t.id ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => submitRename(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(t.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="w-full text-base font-semibold bg-transparent border-b border-gray-400 dark:border-gray-500 outline-none pb-0.5"
                        autoFocus
                      />
                    ) : (
                      <CardTitle
                        className="text-base cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5 group"
                        onClick={() => startRename(t)}
                      >
                        {t.name}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </CardTitle>
                    )}
                    <CardDescription>{new Date(t.createdAt).toLocaleDateString()}</CardDescription>
                  </div>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="space-y-1.5">
                  {t.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{ex.exercise.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {ex.sets} × {ex.reps}
                      </Badge>
                    </div>
                  ))}
                  {t.exercises.length === 0 && (
                    <p className="text-xs text-gray-400">No exercises</p>
                  )}
                </div>
                <Button
                  className="w-full gap-2 mt-auto"
                  size="sm"
                  onClick={() => startFromTemplate(t)}
                >
                  <Play className="h-3.5 w-3.5" />
                  Start Workout
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
