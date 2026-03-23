"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  category: string;
}

interface HistoryPoint {
  date: string;
  setCount: number;
  maxWeightLb: number;
  maxReps: number;
  avgWeightLb: number;
}

interface Suggestion {
  weightLb: number;
  reps: string;
  note: string;
}

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OverloadPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingEx, setLoadingEx] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loadingSug, setLoadingSug] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch("/api/workout/exercises")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setExercises(d.exercises ?? []); })
      .catch(console.error)
      .finally(() => setLoadingEx(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setSuggestion(null); setHistory([]); return; }
    setLoadingSug(true);
    fetch(`/api/workout/overload?exerciseId=${selectedId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setSuggestion(d.suggestion ?? null); setHistory(d.history ?? []); } })
      .catch(console.error)
      .finally(() => setLoadingSug(false));
  }, [selectedId]);

  const selected = exercises.find((e) => e.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Progressive Overload</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Get weight and rep recommendations based on your training history.
        </p>
      </div>

      {/* Exercise selector */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Select exercise</CardTitle></CardHeader>
        <CardContent>
          {loadingEx ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <select
              className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900"
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setShowHistory(false); }}
            >
              <option value="">Select an exercise…</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name} ({muscleLabel(ex.muscleGroup)})</option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {/* Suggestion */}
      {selectedId && (
        <>
          {loadingSug ? (
            <Skeleton className="h-40 w-full" />
          ) : suggestion === null && history.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No data yet.</p>
                <p className="text-xs text-gray-400 mt-1">Log at least one completed session with {selected?.name} to get suggestions.</p>
              </CardContent>
            </Card>
          ) : suggestion ? (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base text-green-900 dark:text-green-100">Next session recommendation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400">Target weight</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{suggestion.weightLb} <span className="text-lg font-normal">lb</span></p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400">Target reps</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{suggestion.reps}</p>
                  </div>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900 rounded-lg px-3 py-2">
                  {suggestion.note}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setShowHistory((v) => !v)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent history ({history.length} sessions)</CardTitle>
                  {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </CardHeader>
              {showHistory && (
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {history.map((h, i) => (
                      <div key={i} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString()}</p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-sm font-medium">{h.maxWeightLb} lb</span>
                            <span className="text-sm text-gray-500">× {h.maxReps} reps</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{h.setCount} sets</p>
                          {i === 0 && <Badge variant="secondary" className="text-xs mt-0.5">Last</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}

      {/* Explanation */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">How this works</CardTitle></CardHeader>
        <CardContent>
          <CardDescription className="text-xs leading-relaxed space-y-1">
            <p>• If you hit <strong>12+ reps</strong> on your top set → increase weight by 5 lb</p>
            <p>• If you hit <strong>8-11 reps</strong> → same weight, aim for one more rep</p>
            <p>• If you hit <strong>fewer than 8</strong> → stay at the same weight until form is solid</p>
            <p>• If no progress for 2+ sessions → consider a deload or technique check</p>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
