"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, ExternalLink, Plus, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Beginner:     "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Intermediate: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Advanced:     "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const DIFFICULTY_ORDER: Record<Difficulty, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

function getDifficulty(description: string | null): Difficulty {
  const d = (description ?? "").toUpperCase();
  if (d.includes("LEVEL: ADVANCED")) return "Advanced";
  if (d.includes("LEVEL: INTERMEDIATE")) return "Intermediate";
  return "Beginner";
}

function getCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("abs") || n.includes("core") || n.includes("six pack") || n.includes("athletic core") || n.includes("weighted abs")) return "Core & Abs";
  if (n.includes("bodyweight") || n.includes("calisthenics")) return "Bodyweight";
  if (n.includes("strength") || n.includes("5/3/1") || n.includes("texas") || n.includes("starting")) return "Strength";
  if (n.includes("powerbuilding") || n.includes("phul")) return "Powerbuilding";
  if (n.includes("hypertrophy") || n.includes("gvt") || n.includes("german") || n.includes("arnold") || n.includes("bro") || n.includes("ppl") || n.includes("push") || n.includes("upper")) return "Hypertrophy";
  return "General";
}

const CATEGORY_COLORS: Record<string, string> = {
  "Core & Abs":   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "Bodyweight":   "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
  "Strength":     "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  "Powerbuilding":"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "Hypertrophy":  "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  "General":      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export default function CoreProgramsPage() {
  const [programs, setPrograms] = useState<CoreProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/workout/core-programs")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.programs) setPrograms(d.programs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function copyProgram(program: CoreProgram) {
    setCopying(program.id);
    const res = await fetch("/api/workout/core-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: program.id }),
    });
    if (res.ok) {
      const copy = await res.json();
      setPrograms((prev) => prev.map((p) =>
        p.id === program.id ? { ...p, addedToMyPrograms: true, myProgramId: copy.id } : p
      ));
      toast.success(`${program.name} added to your programs!`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to add program.");
    }
    setCopying(null);
  }

  async function setActive(myProgramId: string, name: string) {
    setActivating(myProgramId);
    const res = await fetch(`/api/workout/programs/${myProgramId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      setPrograms((prev) => prev.map((p) => ({
        ...p,
        myProgramActive: p.myProgramId === myProgramId ? true : p.myProgramActive,
      })));
      toast.success(`${name} set as active program.`);
    }
    setActivating(null);
  }

  const categories = ["All", ...Array.from(new Set(programs.map((p) => getCategory(p.name))))].sort();

  const sorted = [...programs]
    .filter((p) => filter === "All" || getCategory(p.name) === filter)
    .sort((a, b) => {
      const da = getDifficulty(a.description);
      const db = getDifficulty(b.description);
      if (DIFFICULTY_ORDER[da] !== DIFFICULTY_ORDER[db]) return DIFFICULTY_ORDER[da] - DIFFICULTY_ORDER[db];
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Core Programs</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Proven training programs for every goal and level. Add any to your account to start following it.
        </p>
        {!loading && (
          <p className="text-xs text-gray-400 mt-2">{programs.length} programs available</p>
        )}
      </div>

      {/* Category filter */}
      {!loading && categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === cat
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Programs list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-28 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <LayoutGrid className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No programs found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((program) => {
            const difficulty = getDifficulty(program.description);
            const category = getCategory(program.name);
            const descPreview = (program.description ?? "").split("LEVEL:")[0].trim();
            return (
              <Card key={program.id} className={program.myProgramActive ? "ring-2 ring-gray-900 dark:ring-gray-100" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CardTitle className="text-base">{program.name}</CardTitle>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[difficulty]}`}>
                          {difficulty}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category]}`}>
                          {category}
                        </span>
                        {program.myProgramActive && <Badge className="text-xs">Active</Badge>}
                        {program.addedToMyPrograms && !program.myProgramActive && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Check className="h-3 w-3" />In My Programs
                          </Badge>
                        )}
                      </div>
                      {descPreview && (
                        <CardDescription className="text-xs line-clamp-2">{descPreview}</CardDescription>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!program.addedToMyPrograms ? (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={copying === program.id}
                          onClick={() => copyProgram(program)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {copying === program.id ? "Adding..." : "Add"}
                        </Button>
                      ) : (
                        <>
                          {!program.myProgramActive && program.myProgramId && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={activating === program.myProgramId}
                              onClick={() => setActive(program.myProgramId!, program.name)}
                            >
                              {activating === program.myProgramId ? "Setting..." : "Set Active"}
                            </Button>
                          )}
                          {program.myProgramId && (
                            <Link href={`/workout/programs/${program.myProgramId}`}>
                              <Button size="sm" variant="ghost" className="gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{program.daysPerWeek} days/week</span>
                    <span>{program.durationWeeks} weeks</span>
                    <span>{program.days.length} training days</span>
                    <span>{program.days.reduce((acc, d) => acc + (d.exercises as unknown[]).length, 0)} exercises</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          Programs are based on established training methodologies. Adjust volume and intensity to your level.
        </p>
      </div>
    </div>
  );
}
