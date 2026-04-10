"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trophy, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  sport: string | null;
  metric: string | null;
  unit: string | null;
  createdAt: string;
  participants: { id: string }[];
  matches: { id: string; winnerId: string | null }[];
}

const STATUS_LABELS: Record<Tournament["status"], string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<Tournament["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  ACTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState("");
  const [metric, setMetric] = useState("");
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workout/tournaments")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTournaments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/workout/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, sport, metric, unit }),
    });
    if (res.ok) {
      const t = await res.json();
      router.push(`/workout/tournaments/${t.id}`);
    } else {
      toast.error("Failed to create tournament.");
      setSaving(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this tournament?")) return;
    const res = await fetch(`/api/workout/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTournaments((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tournament deleted.");
    } else {
      toast.error("Failed to delete.");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tournaments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create single-elimination brackets for any fitness challenge.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Tournament</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. Bench Press Showdown"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="e.g. Best 1-rep max wins"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sport / Category (optional)</Label>
                <Input
                  placeholder="e.g. Powerlifting, Basketball, Swimming"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Metric (optional)</Label>
                  <Input
                    placeholder="e.g. 1RM Bench"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit (optional)</Label>
                  <Input
                    placeholder="e.g. lbs"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} size="sm">
                  {saving ? "Creating…" : "Create & add participants"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Trophy className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No tournaments yet</p>
            <p className="text-xs text-gray-400">
              Create a bracket to track head-to-head fitness competitions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => {
            const completed = t.matches.filter((m) => m.winnerId).length;
            const total = t.matches.length;
            return (
              <Link
                key={t.id}
                href={`/workout/tournaments/${t.id}`}
                className="block group"
              >
                <Card className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Trophy className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {t.name}
                            </p>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}
                            >
                              {STATUS_LABELS[t.status]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t.participants.length} participant{t.participants.length !== 1 ? "s" : ""}
                            {total > 0 && ` · ${completed}/${total} matches done`}
                            {t.sport && ` · ${t.sport}`}
                            {t.metric && ` · ${t.metric}${t.unit ? ` (${t.unit})` : ""}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => handleDelete(t.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
