"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Square, MapPin, MapPinOff, Trash2, PersonStanding, Zap } from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

type CardioType = "running" | "walking";
type SessionState = "idle" | "active" | "paused";

interface Waypoint { lat: number; lng: number; ts: number }

interface CardioSession {
  id: string;
  type: CardioType;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  calories: number | null;
  avgPaceSecPerKm: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  notes: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPace(secPerKm: number) {
  if (!secPerKm || secPerKm === Infinity) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

/** Haversine distance in metres between two lat/lng points */
function haversine(a: Waypoint, b: Waypoint) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Rough calorie estimate (MET-based) */
function estimateCalories(type: CardioType, durationSec: number, distanceM: number) {
  // MET: running ~10, walking ~3.5; weight assumed 70 kg
  const weightKg = 70;
  const met = type === "running" ? 10 : 3.5;
  return Math.round((met * weightKg * (durationSec / 3600)));
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CardioPage() {
  // Mode & session state
  const [mode, setMode] = useState<CardioType>("running");
  const [sessionState, setSessionState] = useState<SessionState>("idle");

  // Live tracking
  const [elapsed, setElapsed] = useState(0); // seconds
  const [distance, setDistance] = useState(0); // metres
  const [heartRate, setHeartRate] = useState("");
  const [maxHR, setMaxHR] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Notes (end-of-session)
  const [notes, setNotes] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);

  // History
  const [history, setHistory] = useState<CardioSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Refs for timer & geo
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedSecsRef = useRef<number>(0);
  const lastWaypointRef = useRef<Waypoint | null>(null);

  // ── Load history ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/workout/cardio")
      .then((r) => r.json())
      .then((d) => setHistory(d.sessions ?? []))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, []);

  // ── GPS ─────────────────────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const wp: Waypoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
        setWaypoints((prev) => {
          if (lastWaypointRef.current) {
            const d = haversine(lastWaypointRef.current, wp);
            setDistance((prev) => prev + d);
          }
          lastWaypointRef.current = wp;
          return [...prev, wp];
        });
        setLocationError(null);
      },
      (err) => setLocationError(err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    lastWaypointRef.current = null;
  }, []);

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer() {
    startTimeRef.current = Date.now() - pausedSecsRef.current * 1000;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // ── Controls ────────────────────────────────────────────────────────────────
  function handleStart() {
    pausedSecsRef.current = 0;
    setElapsed(0);
    setDistance(0);
    setWaypoints([]);
    setHeartRate("");
    setMaxHR(0);
    lastWaypointRef.current = null;
    setSessionState("active");
    startTimer();
    if (locationEnabled) startGPS();
  }

  function handlePause() {
    stopTimer();
    pausedSecsRef.current = elapsed;
    if (locationEnabled) stopGPS();
    setSessionState("paused");
  }

  function handleResume() {
    setSessionState("active");
    startTimer();
    if (locationEnabled) startGPS();
  }

  function handleStop() {
    stopTimer();
    if (locationEnabled) stopGPS();
    setSessionState("idle");
    setShowSave(true);
  }

  // Update maxHR when heart rate changes
  function handleHRChange(val: string) {
    setHeartRate(val);
    const n = parseInt(val);
    if (!isNaN(n) && n > maxHR) setMaxHR(n);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function saveSession() {
    setSaving(true);
    const calories = estimateCalories(mode, elapsed, distance);
    const avgPace = distance > 0 ? (elapsed / (distance / 1000)) : undefined;
    const hrVal = parseInt(heartRate);

    const payload = {
      type: mode,
      completedAt: new Date().toISOString(),
      durationSeconds: elapsed,
      distanceMeters: distance > 0 ? distance : undefined,
      calories,
      avgPaceSecPerKm: avgPace,
      avgHeartRate: !isNaN(hrVal) ? hrVal : undefined,
      maxHeartRate: maxHR > 0 ? maxHR : undefined,
      notes: notes || undefined,
      route: waypoints.length > 0 ? waypoints : undefined,
    };

    const res = await fetch("/api/workout/cardio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const saved = await res.json();
      setHistory((prev) => [saved, ...prev]);
      toast.success("Session saved!");
      setShowSave(false);
      setNotes("");
      setElapsed(0);
      setDistance(0);
    } else {
      toast.error("Failed to save session.");
    }
    setSaving(false);
  }

  function discardSession() {
    setShowSave(false);
    setElapsed(0);
    setDistance(0);
    setNotes("");
  }

  async function deleteSession(id: string) {
    const res = await fetch(`/api/workout/cardio/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setHistory((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session deleted.");
    }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const pace = distance > 0 && elapsed > 0 ? elapsed / (distance / 1000) : 0;
  const calories = estimateCalories(mode, elapsed, distance);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cardio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your runs and walks with live stats.</p>
        </div>
      </div>

      {/* Mode selector */}
      {sessionState === "idle" && !showSave && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("running")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === "running"
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Zap className="h-4 w-4" /> Running
          </button>
          <button
            onClick={() => setMode("walking")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === "walking"
                ? "bg-blue-500 border-blue-500 text-white"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <PersonStanding className="h-4 w-4" /> Walking
          </button>
        </div>
      )}

      {/* Active / paused session */}
      {(sessionState !== "idle" || showSave) && (
        <Card className={`border-2 ${mode === "running" ? "border-orange-400" : "border-blue-400"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize flex items-center gap-2">
                {mode === "running" ? <Zap className="h-4 w-4 text-orange-500" /> : <PersonStanding className="h-4 w-4 text-blue-500" />}
                {mode}
              </CardTitle>
              {sessionState === "active" && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 animate-pulse">Live</Badge>
              )}
              {sessionState === "paused" && (
                <Badge variant="outline">Paused</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big timer */}
            {!showSave && (
              <div className="text-center py-4">
                <p className="text-6xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                  {formatDuration(elapsed)}
                </p>
                <p className="text-sm text-gray-400 mt-1">elapsed</p>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Distance" value={distance > 0 ? formatDistance(distance) : "—"} sub={locationEnabled ? "GPS" : "manual"} />
              <StatCard label="Calories" value={elapsed > 0 ? `${calories} kcal` : "—"} sub="estimated" />
              <StatCard label="Pace" value={pace > 0 ? formatPace(pace) : "—"} />
              <StatCard label="Heart Rate" value={heartRate ? `${heartRate} bpm` : "—"} sub={maxHR > 0 ? `max ${maxHR}` : undefined} />
            </div>

            {/* Manual inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!locationEnabled && (
                <div className="space-y-1">
                  <Label className="text-xs">Distance (km)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 3.5"
                    value={distance > 0 ? (distance / 1000).toFixed(2) : ""}
                    onChange={(e) => setDistance(parseFloat(e.target.value) * 1000 || 0)}
                    disabled={sessionState === "idle"}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  min="0"
                  max="250"
                  placeholder="e.g. 145"
                  value={heartRate}
                  onChange={(e) => handleHRChange(e.target.value)}
                  disabled={sessionState === "idle"}
                />
              </div>
            </div>

            {/* Location toggle */}
            {sessionState === "idle" && !showSave && (
              <button
                onClick={() => setLocationEnabled((v) => !v)}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  locationEnabled
                    ? "border-green-400 text-green-600 bg-green-50 dark:bg-green-950"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {locationEnabled ? <MapPin className="h-4 w-4" /> : <MapPinOff className="h-4 w-4" />}
                GPS Location {locationEnabled ? "On" : "Off (optional)"}
              </button>
            )}
            {locationError && (
              <p className="text-xs text-red-500">{locationError}</p>
            )}
            {locationEnabled && waypoints.length > 0 && (
              <p className="text-xs text-gray-400">{waypoints.length} GPS points recorded</p>
            )}

            {/* Save form */}
            {showSave && (
              <div className="space-y-2 border-t pt-4">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  placeholder="How did it feel?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 pt-1">
              {sessionState === "idle" && !showSave && (
                <Button onClick={handleStart} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <Play className="h-4 w-4" /> Start
                </Button>
              )}
              {sessionState === "active" && (
                <>
                  <Button onClick={handlePause} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                  <Button onClick={handleStop} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                    <Square className="h-4 w-4" /> Finish
                  </Button>
                </>
              )}
              {sessionState === "paused" && (
                <>
                  <Button onClick={handleResume} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                  <Button onClick={handleStop} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                    <Square className="h-4 w-4" /> Finish
                  </Button>
                </>
              )}
              {showSave && (
                <>
                  <Button onClick={saveSession} disabled={saving} className="gap-2">
                    {saving ? "Saving..." : "Save Session"}
                  </Button>
                  <Button onClick={discardSession} variant="outline">Discard</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start button when idle and not showing save */}
      {sessionState === "idle" && !showSave && (
        <Button onClick={handleStart} size="lg" className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
          <Play className="h-5 w-5" /> Start {mode === "running" ? "Run" : "Walk"}
        </Button>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription>Past cardio sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No sessions yet. Start your first run or walk above.</p>
          ) : (
            <div className="divide-y">
              {history.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 group">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {s.type === "running" ? "🏃 Run" : "🚶 Walk"}
                      </Badge>
                      <p className="text-sm font-medium">
                        {new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[
                        s.durationSeconds && formatDuration(s.durationSeconds),
                        s.distanceMeters && formatDistance(s.distanceMeters),
                        s.calories && `${s.calories} kcal`,
                        s.avgPaceSecPerKm && formatPace(s.avgPaceSecPerKm),
                        s.avgHeartRate && `${s.avgHeartRate} bpm avg`,
                      ].filter(Boolean).join(" · ") || "No data"}
                    </p>
                    {s.notes && <p className="text-xs text-gray-400 italic mt-0.5">{s.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteSession(s.id)}
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
