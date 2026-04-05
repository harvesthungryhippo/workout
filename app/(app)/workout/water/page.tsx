"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatTime } from "@/lib/utils/date";

interface WaterEntry {
  id: string;
  amountMl: number;
  date: string;
}

const QUICK_AMOUNTS = [
  { label: "8 oz", ml: 237 },
  { label: "12 oz", ml: 355 },
  { label: "16 oz", ml: 473 },
  { label: "24 oz", ml: 710 },
  { label: "32 oz", ml: 946 },
  { label: "1L", ml: 1000 },
];

const DAILY_GOAL_ML = 2700; // ~91 oz / ~3 liters (general recommendation)

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mlToOz(ml: number) {
  return (ml / 29.574).toFixed(0);
}

export default function WaterPage() {
  const [date, setDate] = useState(toDateString(new Date()));
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workout/water?date=${date}`)
      .then((r) => r.json())
      .then((d) => { setEntries(d.entries ?? []); setTotalMl(d.totalMl ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(toDateString(d));
  }

  async function logAmount(ml: number) {
    const res = await fetch("/api/workout/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMl: ml, date: new Date(date).toISOString() }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setTotalMl((prev) => prev + ml);
      toast.success(`+${mlToOz(ml)} oz logged.`);
    } else {
      toast.error("Failed to log water.");
    }
  }

  async function deleteEntry(id: string, ml: number) {
    const res = await fetch(`/api/workout/water/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotalMl((prev) => prev - ml);
      toast.success("Entry deleted.");
    }
  }

  const progressPct = Math.min(100, Math.round((totalMl / DAILY_GOAL_ML) * 100));
  const isToday = date === toDateString(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Water Intake</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track daily hydration.</p>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
        />
        <button
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className="p-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && <button onClick={() => setDate(toDateString(new Date()))} className="text-xs text-gray-500 hover:text-gray-700 underline">Today</button>}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6 pb-4 space-y-3">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mlToOz(totalMl)} oz</p>
                <p className="text-xs text-gray-500">{(totalMl / 1000).toFixed(1)}L · goal: {mlToOz(DAILY_GOAL_ML)} oz</p>
              </div>
            </div>
            <span className={`text-lg font-bold ${progressPct >= 100 ? "text-green-600" : "text-gray-500"}`}>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick-add buttons */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Quick add</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_AMOUNTS.map(({ label, ml }) => (
              <Button key={label} variant="outline" size="sm" onClick={() => logAmount(ml)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Custom oz"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              min={1}
              className="h-9 w-28 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-gray-900"
            />
            <Button
              size="sm"
              disabled={!custom || parseFloat(custom) <= 0}
              onClick={() => { logAmount(Math.round(parseFloat(custom) * 29.574)); setCustom(""); }}
            >
              Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log */}
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : entries.length > 0 ? (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Log</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 group">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">{mlToOz(e.amountMl)} oz</span>
                    <span className="text-xs text-gray-400">({e.amountMl} ml)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatTime(e.date)}</span>
                    <button
                      onClick={() => deleteEntry(e.id, e.amountMl)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
