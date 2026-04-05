"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play, Pause, Square, MapPin, MapPinOff, Trash2,
  PersonStanding, Zap, ClipboardList, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

// ── Types ──────────────────────────────────────────────────────────────────────

type CardioType = "running" | "walking";
type Equipment = "outdoor" | "treadmill";
type SessionState = "idle" | "active" | "paused";
type EntryMode = "live" | "manual"; // live = track now, manual = log after

interface Waypoint { lat: number; lng: number; ts: number }

interface CardioSession {
  id: string;
  type: CardioType;
  equipment: string | null;
  treadmillMode: string | null;
  inclinePercent: number | null;
  speedKmh: number | null;
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

// ── Treadmill presets ──────────────────────────────────────────────────────────

interface TreadmillPreset {
  id: string;
  label: string;
  description: string;
  defaultIncline?: number;
  defaultSpeed?: number;
}

const TREADMILL_PRESETS: TreadmillPreset[] = [
  { id: "manual",    label: "Manual",           description: "Fully custom — you set speed & incline" },
  { id: "fat_burn",  label: "Fat Burn",         description: "Low-moderate intensity, sustained pace", defaultIncline: 1, defaultSpeed: 5.5 },
  { id: "interval",  label: "Interval",         description: "Alternating high/low intensity bursts", defaultIncline: 0 },
  { id: "hill",      label: "Hill Climb",       description: "Steady incline to build leg strength", defaultIncline: 8, defaultSpeed: 5 },
  { id: "cardio",    label: "Cardio",           description: "Moderate intensity to elevate heart rate", defaultIncline: 1, defaultSpeed: 7 },
  { id: "speed",     label: "Speed / Race",     description: "High speed flat run for performance", defaultIncline: 0, defaultSpeed: 12 },
  { id: "custom",    label: "Custom Program",   description: "User-defined treadmill program" },
];

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

function haversine(a: Waypoint, b: Waypoint) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function estimateCalories(type: CardioType, durationSec: number, distanceM: number) {
  const weightKg = 70;
  const met = type === "running" ? 10 : 3.5;
  return Math.round(met * weightKg * (durationSec / 3600));
}

/** Return a datetime-local string (YYYY-MM-DDTHH:MM) in local time */
function toLocalDateTimeString(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Convert "HH:MM" or "MM:SS" or plain minutes string to total seconds */
function parseDurationInput(val: string): number {
  const parts = val.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return (parseFloat(val) || 0) * 60; // treat plain number as minutes
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
  // Top-level mode: live tracking vs log after the fact
  const [entryMode, setEntryMode] = useState<EntryMode>("live");

  // Shared session settings
  const [cardioType, setCardioType] = useState<CardioType>("running");
  const [equipment, setEquipment] = useState<Equipment>("outdoor");
  const [treadmillPreset, setTreadmillPreset] = useState<string>("manual");

  // ── Live tracking state ────────────────────────────────────────────────────
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [heartRate, setHeartRate] = useState("");
  const [maxHR, setMaxHR] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [liveIncline, setLiveIncline] = useState("");
  const [liveSpeed, setLiveSpeed] = useState("");

  // ── Manual entry state ─────────────────────────────────────────────────────
  const [manualDuration, setManualDuration] = useState(""); // "MM:SS" or plain minutes
  const [manualDistanceKm, setManualDistanceKm] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualAvgHR, setManualAvgHR] = useState("");
  const [manualMaxHR, setManualMaxHR] = useState("");
  const [manualIncline, setManualIncline] = useState("");
  const [manualSpeed, setManualSpeed] = useState("");
  const [manualDate, setManualDate] = useState(() => toLocalDateTimeString(new Date()));

  // ── Common save state ──────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);

  // History
  const [history, setHistory] = useState<CardioSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Refs for live timer & geo
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedSecsRef = useRef<number>(0);
  const lastWaypointRef = useRef<Waypoint | null>(null);

  // Sync treadmill preset defaults into speed/incline fields
  useEffect(() => {
    const preset = TREADMILL_PRESETS.find((p) => p.id === treadmillPreset);
    if (!preset) return;
    if (entryMode === "live") {
      if (preset.defaultIncline !== undefined) setLiveIncline(String(preset.defaultIncline));
      if (preset.defaultSpeed !== undefined) setLiveSpeed(String(preset.defaultSpeed));
    } else {
      if (preset.defaultIncline !== undefined) setManualIncline(String(preset.defaultIncline));
      if (preset.defaultSpeed !== undefined) setManualSpeed(String(preset.defaultSpeed));
    }
  }, [treadmillPreset, entryMode]);

  // ── Load history ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/workout/cardio")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setHistory(d.sessions ?? []); })
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

  // ── Live controls ────────────────────────────────────────────────────────────
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

  function handleHRChange(val: string) {
    setHeartRate(val);
    const n = parseInt(val);
    if (!isNaN(n) && n > maxHR) setMaxHR(n);
  }

  // ── Save live session ────────────────────────────────────────────────────────
  async function saveLiveSession() {
    setSaving(true);
    const calories = estimateCalories(cardioType, elapsed, distance);
    const avgPace = distance > 0 ? elapsed / (distance / 1000) : undefined;
    const hrVal = parseInt(heartRate);
    const inclineVal = parseFloat(liveIncline);
    const speedVal = parseFloat(liveSpeed);

    const payload = {
      type: cardioType,
      equipment,
      treadmillMode: equipment === "treadmill" ? treadmillPreset : undefined,
      inclinePercent: equipment === "treadmill" && !isNaN(inclineVal) ? inclineVal : undefined,
      speedKmh: equipment === "treadmill" && !isNaN(speedVal) ? speedVal : undefined,
      startedAt: new Date(startTimeRef.current).toISOString(),
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

    try {
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
    } catch {
      toast.error("Failed to save session. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function discardSession() {
    setShowSave(false);
    setElapsed(0);
    setDistance(0);
    setNotes("");
  }

  // ── Save manual session ──────────────────────────────────────────────────────
  async function saveManualSession() {
    const durationSecs = parseDurationInput(manualDuration);
    if (!durationSecs) {
      toast.error("Please enter a duration.");
      return;
    }

    setSaving(true);
    const distMeters = manualDistanceKm ? parseFloat(manualDistanceKm) * 1000 : undefined;
    const cals = manualCalories
      ? parseInt(manualCalories)
      : distMeters !== undefined
      ? estimateCalories(cardioType, durationSecs, distMeters)
      : undefined;
    const avgPace =
      distMeters && distMeters > 0 ? durationSecs / (distMeters / 1000) : undefined;
    const avgHRVal = parseInt(manualAvgHR);
    const maxHRVal = parseInt(manualMaxHR);
    const inclineVal = parseFloat(manualIncline);
    const speedVal = parseFloat(manualSpeed);
    const sessionDate = new Date(manualDate);

    const payload = {
      type: cardioType,
      equipment,
      treadmillMode: equipment === "treadmill" ? treadmillPreset : undefined,
      inclinePercent: equipment === "treadmill" && !isNaN(inclineVal) ? inclineVal : undefined,
      speedKmh: equipment === "treadmill" && !isNaN(speedVal) ? speedVal : undefined,
      startedAt: sessionDate.toISOString(),
      completedAt: new Date(sessionDate.getTime() + durationSecs * 1000).toISOString(),
      durationSeconds: durationSecs,
      distanceMeters: distMeters,
      calories: cals,
      avgPaceSecPerKm: avgPace,
      avgHeartRate: !isNaN(avgHRVal) ? avgHRVal : undefined,
      maxHeartRate: !isNaN(maxHRVal) ? maxHRVal : undefined,
      notes: notes || undefined,
    };

    try {
      const res = await fetch("/api/workout/cardio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        setHistory((prev) => [saved, ...prev].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
        toast.success("Session logged!");
        // Reset manual form
        setManualDuration("");
        setManualDistanceKm("");
        setManualCalories("");
        setManualAvgHR("");
        setManualMaxHR("");
        setManualIncline("");
        setManualSpeed("");
        setNotes("");
        setManualDate(toLocalDateTimeString(new Date()));
      } else {
        toast.error("Failed to log session.");
      }
    } catch {
      toast.error("Failed to log session. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id: string) {
    const res = await fetch(`/api/workout/cardio/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setHistory((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session deleted.");
    }
  }

  // ── Derived live stats ──────────────────────────────────────────────────────
  const pace = distance > 0 && elapsed > 0 ? elapsed / (distance / 1000) : 0;
  const calories = estimateCalories(cardioType, elapsed, distance);

  const isTreadmill = equipment === "treadmill";
  const selectedPreset = TREADMILL_PRESETS.find((p) => p.id === treadmillPreset);

  // ── Shared top section (type/equipment/preset pickers) ──────────────────────
  const isConfigurable = entryMode === "live" ? sessionState === "idle" && !showSave : true;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cardio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your runs and walks.</p>
        </div>
      </div>

      {/* Entry mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setEntryMode("live"); setShowSave(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            entryMode === "live"
              ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Timer className="h-4 w-4" /> Track Live
        </button>
        <button
          onClick={() => { setEntryMode("manual"); setShowSave(false); stopTimer(); if (locationEnabled) stopGPS(); setSessionState("idle"); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            entryMode === "manual"
              ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Log After
        </button>
      </div>

      {/* ── Shared config: type + equipment ────────────────────────────────── */}
      {isConfigurable && (
        <div className="space-y-4">
          {/* Activity type */}
          <div className="flex gap-2">
            <button
              onClick={() => setCardioType("running")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                cardioType === "running"
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Zap className="h-4 w-4" /> Running
            </button>
            <button
              onClick={() => setCardioType("walking")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                cardioType === "walking"
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <PersonStanding className="h-4 w-4" /> Walking
            </button>
          </div>

          {/* Equipment */}
          <div className="flex gap-2">
            <button
              onClick={() => setEquipment("outdoor")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                equipment === "outdoor"
                  ? "bg-green-600 border-green-600 text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              Outdoor
            </button>
            <button
              onClick={() => setEquipment("treadmill")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                equipment === "treadmill"
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              Treadmill
            </button>
          </div>

          {/* Treadmill preset / mode */}
          {isTreadmill && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Treadmill Program / Mode</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TREADMILL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setTreadmillPreset(preset.id)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      treadmillPreset === preset.id
                        ? "bg-purple-50 dark:bg-purple-950 border-purple-400 text-purple-700 dark:text-purple-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <p className="font-medium">{preset.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ LIVE TRACKING ════════════════════════════════════════ */}
      {entryMode === "live" && (
        <>
          {(sessionState !== "idle" || showSave) && (
            <Card className={`border-2 ${cardioType === "running" ? "border-orange-400" : "border-blue-400"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize flex items-center gap-2">
                    {cardioType === "running" ? <Zap className="h-4 w-4 text-orange-500" /> : <PersonStanding className="h-4 w-4 text-blue-500" />}
                    {cardioType}
                    {isTreadmill && (
                      <Badge variant="outline" className="text-purple-600 border-purple-400 text-xs">
                        Treadmill · {selectedPreset?.label}
                      </Badge>
                    )}
                  </CardTitle>
                  {sessionState === "active" && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 animate-pulse">Live</Badge>
                  )}
                  {sessionState === "paused" && <Badge variant="outline">Paused</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showSave && (
                  <div className="text-center py-4">
                    <p className="text-6xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                      {formatDuration(elapsed)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">elapsed</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Distance" value={distance > 0 ? formatDistance(distance) : "—"} sub={locationEnabled ? "GPS" : "manual"} />
                  <StatCard label="Calories" value={elapsed > 0 ? `${calories} kcal` : "—"} sub="estimated" />
                  <StatCard label="Pace" value={pace > 0 ? formatPace(pace) : "—"} />
                  <StatCard label="Heart Rate" value={heartRate ? `${heartRate} bpm` : "—"} sub={maxHR > 0 ? `max ${maxHR}` : undefined} />
                </div>

                {/* Treadmill live inputs */}
                {isTreadmill && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Avg Speed (km/h)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 8.0"
                        value={liveSpeed}
                        onChange={(e) => setLiveSpeed(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Avg Incline (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="30"
                        placeholder="e.g. 2.0"
                        value={liveIncline}
                        onChange={(e) => setLiveIncline(e.target.value)}
                      />
                    </div>
                  </div>
                )}

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

                {/* GPS toggle (outdoor only) */}
                {!isTreadmill && sessionState === "idle" && !showSave && (
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
                {locationError && <p className="text-xs text-red-500">{locationError}</p>}
                {locationEnabled && waypoints.length > 0 && (
                  <p className="text-xs text-gray-400">{waypoints.length} GPS points recorded</p>
                )}

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
                      <Button onClick={saveLiveSession} disabled={saving}>
                        {saving ? "Saving…" : "Save Session"}
                      </Button>
                      <Button onClick={discardSession} variant="outline">Discard</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {sessionState === "idle" && !showSave && (
            <Button onClick={handleStart} size="lg" className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
              <Play className="h-5 w-5" /> Start {cardioType === "running" ? "Run" : "Walk"}
            </Button>
          )}
        </>
      )}

      {/* ═══════════════ MANUAL / LOG AFTER ═══════════════════════════════════ */}
      {entryMode === "manual" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Log Past Session
              {isTreadmill && selectedPreset && (
                <Badge variant="outline" className="text-purple-600 border-purple-400 text-xs">
                  Treadmill · {selectedPreset.label}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Enter values from your {isTreadmill ? "treadmill" : "outdoor"} session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date & time */}
            <div className="space-y-1">
              <Label className="text-xs">Date & Time</Label>
              <Input
                type="datetime-local"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>

            {/* Duration + Distance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration <span className="text-gray-400">(MM:SS or mins)</span></Label>
                <Input
                  type="text"
                  placeholder="e.g. 30:00"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Distance (km) <span className="text-gray-400">optional</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 3.5"
                  value={manualDistanceKm}
                  onChange={(e) => setManualDistanceKm(e.target.value)}
                />
              </div>
            </div>

            {/* Treadmill-specific */}
            {isTreadmill && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Avg Speed (km/h)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 8.0"
                    value={manualSpeed}
                    onChange={(e) => setManualSpeed(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avg Incline (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    placeholder="e.g. 2.0"
                    value={manualIncline}
                    onChange={(e) => setManualIncline(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Heart rate + Calories */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Avg Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  min="0"
                  max="250"
                  placeholder="e.g. 145"
                  value={manualAvgHR}
                  onChange={(e) => setManualAvgHR(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  min="0"
                  max="250"
                  placeholder="e.g. 170"
                  value={manualMaxHR}
                  onChange={(e) => setManualMaxHR(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Calories <span className="text-gray-400">optional</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="auto-estimated"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                placeholder="How did it feel?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button onClick={saveManualSession} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving…" : "Log Session"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── History ──────────────────────────────────────────────────────────── */}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize text-xs">
                        {s.type === "running" ? "🏃 Run" : "🚶 Walk"}
                      </Badge>
                      {s.equipment === "treadmill" && (
                        <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                          🏃‍♂️ Treadmill
                          {s.treadmillMode && s.treadmillMode !== "manual" && (
                            <> · {TREADMILL_PRESETS.find((p) => p.id === s.treadmillMode)?.label ?? s.treadmillMode}</>
                          )}
                        </Badge>
                      )}
                      <p className="text-sm font-medium">
                        {formatDate(s.startedAt, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[
                        s.durationSeconds && formatDuration(s.durationSeconds),
                        s.distanceMeters && formatDistance(s.distanceMeters),
                        s.calories && `${s.calories} kcal`,
                        s.avgPaceSecPerKm && formatPace(s.avgPaceSecPerKm),
                        s.avgHeartRate && `${s.avgHeartRate} bpm avg`,
                        s.speedKmh && `${s.speedKmh} km/h`,
                        s.inclinePercent !== null && s.inclinePercent !== undefined && `${s.inclinePercent}% incline`,
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
