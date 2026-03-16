"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2 } from "lucide-react";
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

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workout/programs")
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="text-sm text-gray-500 mt-1">Structured training plans to follow.</p>
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
            <p className="text-sm text-gray-400">No programs yet. Create your first training plan.</p>
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
  );
}
