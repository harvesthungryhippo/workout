"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

// Epley formula: 1RM = w * (1 + r/30)
function epley(weight: number, reps: number) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Brzycki: 1RM = w * 36 / (37 - r)
function brzycki(weight: number, reps: number) {
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 36;
  return weight * (36 / (37 - reps));
}

// % of 1RM for rep targets (Prilepin-ish)
const REP_PERCENTAGES = [
  { reps: 1,  pct: 100 },
  { reps: 2,  pct: 97  },
  { reps: 3,  pct: 94  },
  { reps: 4,  pct: 91  },
  { reps: 5,  pct: 87  },
  { reps: 6,  pct: 85  },
  { reps: 8,  pct: 80  },
  { reps: 10, pct: 75  },
  { reps: 12, pct: 70  },
  { reps: 15, pct: 65  },
];

interface PR {
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  maxVolume: number;
}

export default function OneRMPage() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workout/stats?days=3650")
      .then((r) => r.json())
      .then((d) => setPrs(d.prs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const w = parseFloat(weight);
  const r = parseInt(reps);
  const validInput = w > 0 && r >= 1 && r <= 36;
  const estimated1RM = validInput ? (epley(w, r) + brzycki(w, r)) / 2 : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">1RM Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">Estimate your one-rep max from any set.</p>
      </div>

      {/* Manual calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculate 1RM</CardTitle>
          <CardDescription>Enter a weight and rep count from any working set</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-1 flex-1">
              <Label>Weight (lb)</Label>
              <Input
                type="number"
                placeholder="e.g. 225"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label>Reps</Label>
              <Input
                type="number"
                placeholder="e.g. 5"
                min={1}
                max={36}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>

          {estimated1RM !== null && (
            <div className="rounded-xl bg-gray-900 text-white p-5 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Estimated 1RM</p>
                <p className="text-4xl font-bold tabular-nums mt-1">{Math.round(estimated1RM)} lb</p>
                <p className="text-xs text-gray-500 mt-1">Average of Epley ({Math.round(epley(w, r))} lb) and Brzycki ({Math.round(brzycki(w, r))} lb)</p>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                <div className="text-gray-400 font-medium">Reps</div>
                <div className="text-gray-400 font-medium col-span-2">Weight</div>
                <div className="text-gray-400 font-medium col-span-2">% of 1RM</div>
                {REP_PERCENTAGES.map(({ reps: tr, pct }) => (
                  <>
                    <div key={`r-${tr}`} className="py-1 font-medium">{tr}</div>
                    <div key={`w-${tr}`} className="py-1 col-span-2">{Math.round(estimated1RM * pct / 100)} lb</div>
                    <div key={`p-${tr}`} className="py-1 col-span-2 text-gray-400">{pct}%</div>
                  </>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estimated 1RMs from logged PRs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">From Your Logged PRs</CardTitle>
          <CardDescription>Estimated 1RM for each exercise based on your best logged set</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : prs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No logged sessions yet.</p>
          ) : (
            <div className="divide-y">
              {prs.map((pr) => {
                const est = pr.maxReps > 0 && pr.maxWeight > 0
                  ? Math.round((epley(pr.maxWeight, pr.maxReps) + brzycki(pr.maxWeight, pr.maxReps)) / 2)
                  : null;
                return (
                  <div key={pr.exerciseName} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{pr.exerciseName}</p>
                      <p className="text-xs text-gray-400">Best set: {pr.maxWeight} lb × {pr.maxReps}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{est ? `~${est} lb` : "—"}</p>
                      <p className="text-xs text-gray-400">est. 1RM</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4">
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> These are estimates using the Epley and Brzycki formulas, averaged together.
            Accuracy decreases above 10 reps. Always train conservatively when attempting true maxes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
