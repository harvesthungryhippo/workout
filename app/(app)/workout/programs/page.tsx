"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Check, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Program {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  durationWeeks: number;
  active: boolean;
  days: { id: string; dayNumber: number; name: string; exercises: unknown[] }[];
}

interface CoreProgram {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  durationWeeks: number;
  days: { id: string; dayNumber: number; name: string; exercises: unknown[] }[];
  addedToMyPrograms: boolean;
  myProgramId: string | null;
  myProgramActive: boolean;
}

const CORE_PROGRAM_META: Record<string, { level: string; levelColor: string; tags: string[] }> = {
  "Push / Pull / Legs (PPL)": {
    level: "Intermediate",
    levelColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tags: ["Hypertrophy", "6 days/week", "Chest · Back · Legs · Shoulders · Arms"],
  },
  "Starting Strength (5×5 Style)": {
    level: "Beginner",
    levelColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    tags: ["Strength", "3 days/week", "Barbell · Squat · Deadlift · Press"],
  },
  "Upper / Lower Split": {
    level: "Intermediate",
    levelColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tags: ["Strength + Size", "4 days/week", "Balanced frequency"],
  },
  "Full Body 3×/Week": {
    level: "Beginner",
    levelColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    tags: ["General Fitness", "3 days/week", "Time-efficient"],
  },
  "PHUL — Power Hypertrophy Upper Lower": {
    level: "Intermediate",
    levelColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tags: ["Power + Size", "4 days/week", "Strength + Hypertrophy"],
  },
  "Arnold Split — Classic Bodybuilding": {
    level: "Advanced",
    levelColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    tags: ["Bodybuilding", "6 days/week", "High volume"],
  },
  "Core Fundamentals": {
    level: "Beginner",
    levelColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    tags: ["Abs & Core", "3 days/week", "No equipment"],
  },
  "Six Pack Builder": {
    level: "Intermediate",
    levelColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tags: ["Abs & Core", "4 days/week", "Weighted + Bodyweight"],
  },
  "Athletic Core — Functional Stability": {
    level: "Intermediate",
    levelColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tags: ["Functional Core", "3 days/week", "Anti-rotation · Stability"],
  },
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [corePrograms, setCorePrograms] = useState<CoreProgram[]>([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [showCore, setShowCore] = useState(true);

  useEffect(() => {
    fetch("/api/workout/programs")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPrograms(d.programs ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/workout/core-programs")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCorePrograms(d.programs ?? []); })
      .catch(console.error)
      .finally(() => setCoreLoading(false));
  }, []);

  async function setActive(id: string) {
    const res = await fetch(`/api/workout/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      setPrograms((prev) =>
        prev.map((p) => ({ ...p, active: p.id === id }))
      );
      toast.success("Program set as active.");
    }
  }

  async function deleteProgram(id: string) {
    const res = await fetch(`/api/workout/programs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      toast.success("Program deleted.");
    }
  }

  async function addCoreProgram(program: CoreProgram) {
    setCopying(program.id);
    const res = await fetch("/api/workout/core-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: program.id }),
    });
    if (res.ok) {
      const copy = await res.json();
      setCorePrograms((prev) =>
        prev.map((p) =>
          p.id === program.id ? { ...p, addedToMyPrograms: true, myProgramId: copy.id } : p
        )
      );
      setPrograms((prev) => [copy, ...prev]);
      toast.success(`${program.name} added to your programs!`);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to add program.");
    }
    setCopying(null);
  }

  return (
    <div className="space-y-8">
      {/* My Programs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Structured training plans to follow.</p>
          </div>
          <Link href="/workout/programs/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Program
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : programs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-gray-400">No programs yet. Create your own or add one from Core Programs below.</p>
              <Link href="/workout/programs/new">
                <Button variant="outline" size="sm" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Program
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {programs.map((program) => (
              <Card key={program.id} className={program.active ? "ring-2 ring-gray-900" : ""}>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{program.name}</CardTitle>
                      {program.active && (
                        <Badge className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    {program.description && (
                      <CardDescription className="mt-1">{program.description}</CardDescription>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {program.daysPerWeek} days/week · {program.durationWeeks} weeks · {program.days.length} days programmed
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {!program.active && (
                      <Button variant="outline" size="sm" onClick={() => setActive(program.id)}>
                        Set active
                      </Button>
                    )}
                    <Link href={`/workout/programs/${program.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => deleteProgram(program.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {program.days.map((day) => (
                      <Badge key={day.id} variant="secondary" className="text-xs">
                        Day {day.dayNumber}: {day.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Core Programs */}
      <div className="space-y-4">
        <button
          className="flex items-center gap-2 w-full text-left group"
          onClick={() => setShowCore((v) => !v)}
        >
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200">
              Core Programs
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pre-built classic programs — add any to your account to start training.
            </p>
          </div>
          {showCore ? (
            <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
          )}
        </button>

        {showCore && (
          coreLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : corePrograms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-400">Core programs not yet available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {corePrograms.map((program) => {
                const meta = CORE_PROGRAM_META[program.name];
                return (
                  <Card key={program.id} className={program.myProgramActive ? "ring-2 ring-gray-900 dark:ring-gray-100" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <CardTitle className="text-sm">{program.name}</CardTitle>
                            {meta && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.levelColor}`}>
                                {meta.level}
                              </span>
                            )}
                            {program.myProgramActive && (
                              <Badge className="text-xs">Active</Badge>
                            )}
                            {program.addedToMyPrograms && !program.myProgramActive && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Check className="h-3 w-3" />
                                Added
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {program.daysPerWeek} days/week · {program.durationWeeks} weeks · {program.days.length} training days
                          </p>
                          {meta && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {meta.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!program.addedToMyPrograms ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={copying === program.id}
                              onClick={() => addCoreProgram(program)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {copying === program.id ? "Adding..." : "Add"}
                            </Button>
                          ) : (
                            program.myProgramId && (
                              <Link href={`/workout/programs/${program.myProgramId}`}>
                                <Button size="sm" variant="ghost">View</Button>
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
