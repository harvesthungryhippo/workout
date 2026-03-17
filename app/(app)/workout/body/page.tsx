"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface BodyEntry {
  id: string;
  date: string;
  weightLbs: string | null;
  bodyFatPct: string | null;
  neckIn: string | null;
  chestIn: string | null;
  waistIn: string | null;
  hipsIn: string | null;
  armsIn: string | null;
  thighsIn: string | null;
  notes: string | null;
}

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  weightLbs: "",
  bodyFatPct: "",
  neckIn: "",
  chestIn: "",
  waistIn: "",
  hipsIn: "",
  armsIn: "",
  thighsIn: "",
  notes: "",
};

function SparkLine({ values, color = "stroke-blue-500" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 120, H = 32, PAD = 2;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" className={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function BodyPage() {
  const [entries, setEntries] = useState<BodyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);

  useEffect(() => {
    fetch("/api/workout/body")
      .then((r) => r.json())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, string | number | null> = { date: form.date, notes: form.notes || null };
    const nums = ["weightLbs", "bodyFatPct", "neckIn", "chestIn", "waistIn", "hipsIn", "armsIn", "thighsIn"] as const;
    for (const k of nums) {
      payload[k] = form[k] ? parseFloat(form[k]) : null;
    }
    const res = await fetch("/api/workout/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Entry saved.");
    } else {
      toast.error("Failed to save entry.");
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/workout/body/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry deleted.");
    }
  }

  // Build chart data from entries (oldest → newest)
  const chronological = [...entries].reverse();
  const weights = chronological.filter((e) => e.weightLbs).map((e) => parseFloat(e.weightLbs!));
  const bfPcts = chronological.filter((e) => e.bodyFatPct).map((e) => parseFloat(e.bodyFatPct!));
  const latest = entries[0];
  const prev = entries[1];

  function delta(curr: string | null, p: string | null) {
    if (!curr || !p) return null;
    return (parseFloat(curr) - parseFloat(p)).toFixed(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Body Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Log weight, body fat, and measurements.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Log Entry
        </Button>
      </div>

      {/* Log Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={field("date")} />
              </div>
              <div className="space-y-1">
                <Label>Weight (lb)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 175.5" value={form.weightLbs} onChange={field("weightLbs")} />
              </div>
              <div className="space-y-1">
                <Label>Body Fat (%)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 18.5" value={form.bodyFatPct} onChange={field("bodyFatPct")} />
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setShowMeasurements(!showMeasurements)}
            >
              {showMeasurements ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Measurements (inches)
            </button>

            {showMeasurements && (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                {(["neckIn", "chestIn", "waistIn", "hipsIn", "armsIn", "thighsIn"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <Label className="capitalize">{k.replace("In", "")}</Label>
                    <Input type="number" step="0.1" placeholder="in" value={form[k]} onChange={field(k)} />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input placeholder="Optional notes..." value={form.notes} onChange={field("notes")} />
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Weight</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest?.weightLbs ? `${parseFloat(latest.weightLbs)} lb` : "—"}</div>
              {delta(latest?.weightLbs ?? null, prev?.weightLbs ?? null) !== null && (
                <p className={`text-xs mt-1 ${parseFloat(delta(latest?.weightLbs ?? null, prev?.weightLbs ?? null)!) > 0 ? "text-red-500" : "text-green-600"}`}>
                  {parseFloat(delta(latest?.weightLbs ?? null, prev?.weightLbs ?? null)!) > 0 ? "+" : ""}
                  {delta(latest?.weightLbs ?? null, prev?.weightLbs ?? null)} lb vs last
                </p>
              )}
              <div className="mt-2"><SparkLine values={weights} color="stroke-blue-500" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Body Fat</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest?.bodyFatPct ? `${parseFloat(latest.bodyFatPct)}%` : "—"}</div>
              {delta(latest?.bodyFatPct ?? null, prev?.bodyFatPct ?? null) !== null && (
                <p className={`text-xs mt-1 ${parseFloat(delta(latest?.bodyFatPct ?? null, prev?.bodyFatPct ?? null)!) > 0 ? "text-red-500" : "text-green-600"}`}>
                  {parseFloat(delta(latest?.bodyFatPct ?? null, prev?.bodyFatPct ?? null)!) > 0 ? "+" : ""}
                  {delta(latest?.bodyFatPct ?? null, prev?.bodyFatPct ?? null)}% vs last
                </p>
              )}
              <div className="mt-2"><SparkLine values={bfPcts} color="stroke-orange-500" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Waist</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest?.waistIn ? `${parseFloat(latest.waistIn)}"` : "—"}</div>
              <p className="text-xs text-gray-400 mt-1">{entries.length} entries total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Lean Mass</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latest?.weightLbs && latest?.bodyFatPct
                  ? `${(parseFloat(latest.weightLbs) * (1 - parseFloat(latest.bodyFatPct) / 100)).toFixed(1)} lb`
                  : "—"}
              </div>
              <p className="text-xs text-gray-400 mt-1">weight × (1 - bf%)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription>Most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No entries yet. Log your first measurement above.</p>
          ) : (
            <div className="divide-y">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 group">
                  <div>
                    <p className="text-sm font-medium">{new Date(e.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">
                      {[
                        e.weightLbs && `${parseFloat(e.weightLbs)} lb`,
                        e.bodyFatPct && `${parseFloat(e.bodyFatPct)}% bf`,
                        e.waistIn && `${parseFloat(e.waistIn)}" waist`,
                      ].filter(Boolean).join(" · ") || "No metrics"}
                    </p>
                    {e.notes && <p className="text-xs text-gray-400 italic mt-0.5">{e.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
