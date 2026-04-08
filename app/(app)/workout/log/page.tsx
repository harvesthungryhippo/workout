"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Timer, Plus, ArrowLeft, CheckCircle2, X, Search, BookmarkPlus, Link2, Pencil, TrendingUp, Trash2, WifiOff, Dumbbell } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

function requestNotificationPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendRestNotification(exerciseName: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Rest complete!", {
      body: `Time to do your next set of ${exerciseName}`,
      icon: "/favicon.ico",
    });
  }
}

function useTimer(onDone?: () => void) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const start = useCallback((s: number) => {
    setSeconds(s);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSeconds(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    if (running && seconds === 0) {
      setRunning(false);
      onDoneRef.current?.();
    }
  }, [running, seconds]);

  return { seconds, running, start, stop };
}

interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number | null;
  weightKg: string | null;
  durationSeconds: number | null;
  completed: boolean;
  rpe: number | null;
}

interface SessionExercise {
  id: string;
  order: number;
  notes: string | null;
  supersetGroup: number | null;
  exercise: { id: string; name: string; muscleGroup: string; category: string };
  sets: WorkoutSet[];
  restSeconds?: number;
}

function isCardio(ex: SessionExercise) {
  return ex.exercise.category === "CARDIO";
}

interface Session {
  id: string;
  name: string | null;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  exercises: SessionExercise[];
}

interface OverloadSuggestion {
  weightLb: number;
  reps: string;
  note: string;
}

// ── Feature 1: PR tracking ──────────────────────────────────────────────────
interface PrRecord {
  maxWeight: number; // lb
  maxReps: number;
}

// ── Feature 2: Session Summary ───────────────────────────────────────────────
interface SummaryExercise {
  name: string;
  setsCompleted: number;
}

interface SessionSummary {
  sessionId: string;
  sessionName: string;
  durationMinutes: number;
  totalSets: number;
  totalVolumeLb: number;
  exercises: SummaryExercise[];
  prsHit: string[]; // display strings like "185 lb × 5 reps"
}

// ── Feature 4: localStorage draft ───────────────────────────────────────────
const LS_DRAFT_KEY = "workout_session_draft";

interface LsDraft {
  sessionId: string;
  savedAt: string;
  exerciseCount: number;
}

function saveLsDraft(sessionId: string, exerciseCount: number) {
  try {
    const draft: LsDraft = { sessionId, savedAt: new Date().toISOString(), exerciseCount };
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draft));
  } catch { /* unavailable */ }
}

function loadLsDraft(): LsDraft | null {
  try {
    const raw = localStorage.getItem(LS_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearLsDraft() {
  try { localStorage.removeItem(LS_DRAFT_KEY); } catch { /* unavailable */ }
}

// ── Offline sync queue ───────────────────────────────────────────────────────
interface PendingSync {
  url: string;
  method: string;
  body: object;
}

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
}

function muscleLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SESSION_STORAGE_KEY = "activeWorkoutSession";

type SavedInputs = Record<string, { reps: string; weight: string; rpe: string; duration: string }>;

function saveSessionState(sessionId: string, inputs: SavedInputs, pendingSync: PendingSync[] = []) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ sessionId, setInputs: inputs, pendingSync }));
  } catch { /* storage unavailable */ }
}

function loadSessionState(): { sessionId: string; setInputs: SavedInputs; pendingSync: PendingSync[] } | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...parsed, pendingSync: parsed.pendingSync ?? [] };
  } catch {
    return null;
  }
}

function clearSessionState() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch { /* storage unavailable */ }
}

// Muscle group filter options for exercise picker
const MUSCLE_GROUPS = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio"] as const;
type MuscleFilter = typeof MUSCLE_GROUPS[number];

const MUSCLE_FILTER_MAP: Record<MuscleFilter, string[]> = {
  All: [],
  Chest: ["CHEST", "PECTORALS"],
  Back: ["BACK", "LATS", "UPPER_BACK", "LOWER_BACK", "TRAPS", "RHOMBOIDS"],
  Shoulders: ["SHOULDERS", "DELTOIDS", "FRONT_DELTS", "SIDE_DELTS", "REAR_DELTS"],
  Arms: ["ARMS", "BICEPS", "TRICEPS", "FOREARMS"],
  Legs: ["LEGS", "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "HIP_FLEXORS", "ADDUCTORS", "ABDUCTORS"],
  Core: ["CORE", "ABS", "OBLIQUES", "LOWER_ABS"],
  Cardio: ["CARDIO", "FULL_BODY"],
};

export default function LogWorkoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programDayId = searchParams.get("programDayId") ?? undefined;
  const programId = searchParams.get("programId") ?? undefined;
  const templateId = searchParams.get("templateId") ?? undefined;
  const sessionName = searchParams.get("name") ?? undefined;
  const repeatSessionId = searchParams.get("repeatSessionId") ?? undefined;
  const pastDate = searchParams.get("pastDate") ?? undefined;
  const initialNotes = searchParams.get("notes") ?? undefined;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyToStart, setReadyToStart] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Template picker on the ready-to-start screen
  interface TemplateOption { id: string; name: string; exercises: { exercise: { name: string } }[] }
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [setInputs, setSetInputs] = useState<Record<string, { reps: string; weight: string; rpe: string; duration: string }>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [allExercises, setAllExercises] = useState<{ id: string; name: string; muscleGroup: string; category: string }[]>([]);
  const [exSearch, setExSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>("All");
  const [timerExName, setTimerExName] = useState("");
  const timer = useTimer(useCallback(() => sendRestNotification(timerExName), [timerExName]));
  const [timerLabel, setTimerLabel] = useState("");
  const [timerEnabled, setTimerEnabled] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("timer_enabled") !== "false" : true
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  // Superset group picker
  const [supersetPickerFor, setSupersetPickerFor] = useState<string | null>(null);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  // Session-level notes
  const [sessionNotes, setSessionNotes] = useState("");
  const [editingSessionNotes, setEditingSessionNotes] = useState(false);

  // Overload hints
  const [overloadHints, setOverloadHints] = useState<Record<string, OverloadSuggestion | null>>({});

  // Last-session reference keyed by sessionExercise.id
  type LastSessionData = { date: string; notes: string | null; sets: { setNumber: number; reps: number | null; weightLb: number | null; durationSeconds: number | null }[] } | null;
  const [lastSessions, setLastSessions] = useState<Record<string, LastSessionData>>({});

  // Feature 1: PR state keyed by exerciseId
  const [prs, setPrs] = useState<Record<string, PrRecord>>({});
  // PRs hit during this session (for feature 2 summary)
  const sessionPrsRef = useRef<string[]>([]);

  // Offline sync queue
  const [pendingSync, setPendingSync] = useState<PendingSync[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingSyncRef = useRef<PendingSync[]>([]);

  // Keep ref in sync immediately (not just after render)
  function updatePendingSync(queue: PendingSync[]) {
    pendingSyncRef.current = queue;
    setPendingSync(queue);
  }

  // Feature 2: summary overlay
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  // Feature 4: localStorage draft banner
  const [lsDraft, setLsDraft] = useState<LsDraft | null>(null);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { requestNotificationPermission(); }, []);

  useEffect(() => {
    if (readyToStart) {
      fetch("/api/workout/templates")
        .then((r) => r.ok ? r.json() : [])
        .then(setTemplates)
        .catch(() => setTemplates([]));
    }
  }, [readyToStart]);

  useEffect(() => {
    setSessionNotes(session?.notes ?? "");
  }, [session?.id]);

  // Persist active session ID + unsaved inputs + sync queue to localStorage
  useEffect(() => {
    if (session?.id) {
      saveSessionState(session.id, setInputs, pendingSync);
    }
  }, [session?.id, setInputs, pendingSync]);

  const drainSyncQueue = useCallback(async () => {
    const queue = [...pendingSyncRef.current];
    if (queue.length === 0 || !navigator.onLine) return;
    setIsSyncing(true);
    const failed: PendingSync[] = [];
    for (const op of queue) {
      try {
        const res = await fetch(op.url, {
          method: op.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(op.body),
        });
        if (!res.ok) failed.push(op);
      } catch {
        failed.push(op);
      }
    }
    pendingSyncRef.current = failed;
    setPendingSync(failed);
    setIsSyncing(false);
  }, []);

  // Track online/offline and auto-sync when reconnected or page becomes visible
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); drainSyncQueue(); };
    const handleOffline = () => setIsOnline(false);
    // On mobile, visibilitychange fires when you unlock the phone
    const handleVisible = () => { if (navigator.onLine) { setIsOnline(true); drainSyncQueue(); } };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [drainSyncQueue]);

  // Feature 4: save localStorage draft whenever session changes
  useEffect(() => {
    if (session?.id) {
      saveLsDraft(session.id, session.exercises.length);
    }
  }, [session?.id, session?.exercises.length]);

  // Feature 1: fetch all-time PRs on mount
  useEffect(() => {
    async function fetchPrs() {
      try {
        const res = await fetch("/api/workout/stats?days=3650");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.prs)) {
          const map: Record<string, PrRecord> = {};
          for (const pr of data.prs) {
            map[pr.exerciseId] = { maxWeight: pr.maxWeight, maxReps: pr.maxReps };
          }
          setPrs(map);
        }
      } catch { /* non-critical */ }
    }
    fetchPrs();
  }, []);

  useEffect(() => {
    const isNewSession = programDayId || programId || templateId || sessionName || repeatSessionId || pastDate;

    async function createNewSession() {
      const res = await fetch("/api/workout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sessionName, programId, programDayId, templateId, repeatSessionId, startedAt: pastDate, notes: initialNotes }),
      });
      const s = await res.json();
      if (s && Array.isArray(s.exercises)) {
        setSession(s);
        initInputs(s);
        saveSessionState(s.id, {});
      } else {
        console.error("session create failed:", s);
      }
    }

    async function init() {
      // Feature 4: check localStorage for a draft (cross-tab / browser-close recovery)
      if (!isNewSession) {
        const draft = loadLsDraft();
        if (draft) {
          const ageMs = Date.now() - new Date(draft.savedAt).getTime();
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (ageMs < twentyFourHours) {
            setLsDraft(draft);
          } else {
            clearLsDraft();
          }
        }
      }

      if (!isNewSession) {
        const saved = loadSessionState();
        if (saved) {
          try {
            const res = await fetch(`/api/workout/sessions/${saved.sessionId}`);
            if (res.ok) {
              const s = await res.json();
              if (s && Array.isArray(s.exercises) && !s.completedAt) {
                setSession(s);
                // Rebuild inputs: use saved draft values where available, fall back to DB values
                const merged: SavedInputs = {};
                for (const ex of s.exercises) {
                  for (const set of ex.sets) {
                    const key = `${ex.id}-${set.setNumber}`;
                    merged[key] = saved.setInputs[key] ?? {
                      reps: set.reps?.toString() ?? "",
                      weight: set.weightKg?.toString() ?? "",
                      rpe: set.rpe?.toString() ?? "",
                      duration: set.durationSeconds ? String(Math.round(set.durationSeconds / 60)) : "",
                    };
                  }
                }
                setSetInputs(merged);
                if (saved.pendingSync?.length > 0) {
                  updatePendingSync(saved.pendingSync);
                  drainSyncQueue();
                }
                toast.info("Resumed your active session.");
                return;
              }
            }
          } catch { /* fall through */ }
          clearSessionState();
        }
        // No saved session and no params — show prompt instead of auto-creating
        setReadyToStart(true);
        return;
      } else {
        clearSessionState();
        clearLsDraft();
      }
      await createNewSession();
    }

    init().catch(console.error).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initInputs(s: Session) {
    const inputs: Record<string, { reps: string; weight: string; rpe: string; duration: string }> = {};
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        inputs[`${ex.id}-${set.setNumber}`] = {
          reps: set.reps?.toString() ?? "",
          weight: set.weightKg?.toString() ?? "",
          rpe: set.rpe?.toString() ?? "",
          duration: set.durationSeconds ? String(Math.round(set.durationSeconds / 60)) : "",
        };
      }
    }
    setSetInputs(inputs);
  }

  function setKey(exId: string, setNum: number) { return `${exId}-${setNum}`; }

  // Fetch overload hint for an exercise when it's added
  async function fetchOverloadHint(exerciseId: string, sessionExId: string) {
    try {
      const res = await fetch(`/api/workout/overload?exerciseId=${exerciseId}`);
      if (res.ok) {
        const data = await res.json();
        setOverloadHints((prev) => ({ ...prev, [sessionExId]: data.suggestion }));
      }
    } catch { /* non-critical */ }
  }

  async function fetchLastSession(exerciseId: string, sessionExId: string) {
    try {
      const res = await fetch(`/api/workout/exercises/${exerciseId}/last-session`);
      if (res.ok) {
        const data = await res.json();
        setLastSessions((prev) => ({ ...prev, [sessionExId]: data }));
      }
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    if (session) {
      for (const ex of session.exercises) {
        fetchOverloadHint(ex.exercise.id, ex.id);
        fetchLastSession(ex.exercise.id, ex.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  async function completeSet(ex: SessionExercise, set: WorkoutSet) {
    if (!session) return;
    const key = setKey(ex.id, set.setNumber);
    const input = setInputs[key] ?? { reps: "", weight: "", rpe: "", duration: "" };
    const cardio = isCardio(ex);

    const body = {
      setNumber: set.setNumber,
      ...(cardio
        ? { durationSeconds: (parseFloat(input.duration) || 0) * 60 || undefined }
        : {
            reps: parseInt(input.reps) || undefined,
            weightKg: parseFloat(input.weight) || undefined,
            rpe: parseInt(input.rpe) || undefined,
          }),
      completed: true,
    };

    // Mark completed immediately — saved to localStorage before any network call
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.id !== ex.id ? e : {
            ...e,
            sets: e.sets.map((s2) =>
              s2.setNumber !== set.setNumber ? s2 : { ...s2, completed: true }
            ),
          }
        ),
      };
    });
    if (!cardio && timerEnabled) {
      const savedDefault = typeof window !== "undefined" ? parseInt(localStorage.getItem("default_rest_seconds") ?? "90") : 90;
      const restSec = ex.restSeconds ?? (isNaN(savedDefault) ? 90 : savedDefault);
      timer.start(restSec);
      setTimerExName(ex.exercise.name);
      setTimerLabel(`Rest: ${ex.exercise.name}`);
    }

    const url = `/api/workout/sessions/${session.id}/exercises/${ex.id}/sets`;
    let res: Response | null = null;
    try {
      res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) res = null;
    } catch {
      res = null;
    }

    if (res) {
      // Feature 1: PR check
      if (!cardio) {
        // input.weight is treated as lb for PR comparison (matches the "Weight (lb)" UI label).
        // PRs from the stats API are also stored in lb, so the comparison is apples-to-apples.
        const weightLb = parseFloat(input.weight) || 0;
        const reps = parseInt(input.reps) || 0;
        const exerciseId = ex.exercise.id;
        const pr = prs[exerciseId];

        let isNewPr = false;
        let prLabel = "";

        if (weightLb > 0) {
          if (!pr || weightLb > pr.maxWeight || (weightLb === pr.maxWeight && reps > pr.maxReps)) {
            isNewPr = true;
            prLabel = `${weightLb} lb × ${reps} reps`;
          }
        } else if (reps > 0) {
          // bodyweight
          if (!pr || reps > pr.maxReps) {
            isNewPr = true;
            prLabel = `${reps} reps (bodyweight)`;
          }
        }

        if (isNewPr && prLabel) {
          toast.success(`🏆 New PR! ${prLabel}`, { duration: 4000 });
          sessionPrsRef.current = [...sessionPrsRef.current, `${ex.exercise.name}: ${prLabel}`];
          // Update local PR state
          setPrs((prev) => ({
            ...prev,
            [exerciseId]: {
              maxWeight: weightLb > 0 ? Math.max(weightLb, prev[exerciseId]?.maxWeight ?? 0) : (prev[exerciseId]?.maxWeight ?? 0),
              maxReps: Math.max(reps, prev[exerciseId]?.maxReps ?? 0),
            },
          }));
        }
      } else {
        // Cardio: check reps-only PR if applicable
        const reps = parseInt(input.reps) || 0;
        if (reps > 0) {
          const exerciseId = ex.exercise.id;
          const pr = prs[exerciseId];
          if (!pr || reps > pr.maxReps) {
            const prLabel = `${reps} reps`;
            toast.success(`🏆 New PR! ${prLabel}`, { duration: 4000 });
            sessionPrsRef.current = [...sessionPrsRef.current, `${ex.exercise.name}: ${prLabel}`];
            setPrs((prev) => ({
              ...prev,
              [exerciseId]: { maxWeight: prev[exerciseId]?.maxWeight ?? 0, maxReps: reps },
            }));
          }
        }
      }

    } else {
      // Network failed — queue for retry when online
      updatePendingSync([...pendingSyncRef.current, { url, method: "PATCH", body }]);
    }
  }

  async function saveExerciseNotes(ex: SessionExercise) {
    if (!session) return;
    const notes = notesDraft[ex.id] ?? ex.notes ?? "";
    const res = await fetch(`/api/workout/sessions/${session.id}/exercises/${ex.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null }),
    });
    if (res.ok) {
      setSession((prev) => prev ? {
        ...prev,
        exercises: prev.exercises.map((e) => e.id !== ex.id ? e : { ...e, notes: notes.trim() || null }),
      } : prev);
      setEditingNotes((prev) => ({ ...prev, [ex.id]: false }));
      toast.success("Notes saved.");
    }
  }

  async function saveSessionNotes(notes: string) {
    if (!session) return;
    await fetch(`/api/workout/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function setSupersetGroup(ex: SessionExercise, group: number | null) {
    if (!session) return;
    const res = await fetch(`/api/workout/sessions/${session.id}/exercises/${ex.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supersetGroup: group }),
    });
    if (res.ok) {
      setSession((prev) => prev ? {
        ...prev,
        exercises: prev.exercises.map((e) => e.id !== ex.id ? e : { ...e, supersetGroup: group }),
      } : prev);
    }
  }

  async function removeExercise(exId: string) {
    if (!session) return;
    const res = await fetch(`/api/workout/sessions/${session.id}/exercises/${exId}`, { method: "DELETE" });
    if (res.ok) {
      setSession((prev) => prev ? { ...prev, exercises: prev.exercises.filter((e) => e.id !== exId) } : prev);
      toast.success("Exercise removed.");
    }
  }

  function openPicker() {
    if (allExercises.length === 0) {
      fetch("/api/workout/exercises")
        .then((r) => r.json())
        .then((d) => setAllExercises(d.exercises ?? []));
    }
    setExSearch("");
    setMuscleFilter("All");
    setShowPicker(true);
  }

  async function addExerciseToSession(ex: { id: string; name: string; muscleGroup: string; category: string }) {
    if (!session) return;
    setShowPicker(false);
    const order = session.exercises.length + 1;
    const res = await fetch(`/api/workout/sessions/${session.id}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: ex.id, order, initialSets: 3 }),
    });
    if (res.ok) {
      const newEx = await res.json();
      setSession((prev) => prev ? { ...prev, exercises: [...prev.exercises, newEx] } : prev);
      const inputs: Record<string, { reps: string; weight: string; rpe: string; duration: string }> = {};
      for (const set of newEx.sets) {
        inputs[`${newEx.id}-${set.setNumber}`] = { reps: "", weight: "", rpe: "", duration: "" };
      }
      setSetInputs((prev) => ({ ...prev, ...inputs }));
      toast.success(`${ex.name} added.`);
      fetchOverloadHint(ex.id, newEx.id);
      fetchLastSession(ex.id, newEx.id);
    }
  }

  async function addSet(ex: SessionExercise) {
    if (!session) return;
    const nextSetNumber = ex.sets.length + 1;
    const res = await fetch(`/api/workout/sessions/${session.id}/exercises/${ex.id}/sets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setNumber: nextSetNumber, completed: false }),
    });
    if (res.ok) {
      const newSet = await res.json();
      setSession((prev) => prev ? {
        ...prev,
        exercises: prev.exercises.map((e) => e.id !== ex.id ? e : { ...e, sets: [...e.sets, newSet] }),
      } : prev);
      setSetInputs((prev) => ({ ...prev, [`${ex.id}-${nextSetNumber}`]: { reps: "", weight: "", rpe: "", duration: "" } }));
    }
  }

  async function finishSession() {
    if (!session) return;
    setCompleting(true);
    const nowMs = Date.now();
    const startedMs = new Date(session.startedAt).getTime();
    const durationSeconds = Math.floor((nowMs - startedMs) / 1000);
    const durationMinutes = Math.round(durationSeconds / 60);

    const res = await fetch(`/api/workout/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: new Date().toISOString(), durationSeconds }),
    });
    if (res.ok) {
      clearSessionState();
      clearLsDraft();

      // Feature 2: build summary
      const KG_TO_LB = 2.20462;
      let totalSets = 0;
      let totalVolumeLb = 0;
      const exerciseSummaries: SummaryExercise[] = [];

      for (const ex of session.exercises) {
        const completed = ex.sets.filter((s) => s.completed);
        if (completed.length === 0) continue;
        totalSets += completed.length;
        for (const s of completed) {
          if (s.weightKg && s.reps) {
            totalVolumeLb += s.reps * Number(s.weightKg) * KG_TO_LB;
          }
        }
        exerciseSummaries.push({ name: ex.exercise.name, setsCompleted: completed.length });
      }

      setSummary({
        sessionId: session.id,
        sessionName: session.name ?? "Workout",
        durationMinutes,
        totalSets,
        totalVolumeLb: Math.round(totalVolumeLb),
        exercises: exerciseSummaries,
        prsHit: [...sessionPrsRef.current],
      });
    }
    setCompleting(false);
  }

  function dismissSummary(goToSession?: boolean) {
    if (summary && goToSession) {
      router.push(`/workout/sessions/${summary.sessionId}/edit`);
    } else {
      router.push("/workout");
    }
    setSummary(null);
    sessionPrsRef.current = [];
    setSession(null);
  }

  async function saveAsTemplate() {
    if (!session || session.exercises.length === 0) { toast.error("Add some exercises first."); return; }
    setSavingTemplate(true);
    const exercises = session.exercises.map((ex, i) => ({
      exerciseId: ex.exercise.id,
      order: i,
      sets: ex.sets.length || 3,
      reps: "8-12",
      restSeconds: ex.restSeconds ?? 90,
    }));
    const res = await fetch("/api/workout/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: session.name ?? "My Template", exercises }),
    });
    if (res.ok) toast.success("Saved as template!");
    else toast.error("Failed to save template.");
    setSavingTemplate(false);
  }

  // Feature 4: resume from localStorage draft
  async function resumeFromDraft() {
    if (!lsDraft) return;
    setLsDraft(null);
    try {
      const res = await fetch(`/api/workout/sessions/${lsDraft.sessionId}`);
      if (res.ok) {
        const s = await res.json();
        if (s && Array.isArray(s.exercises) && !s.completedAt) {
          setSession(s);
          initInputs(s);
          toast.info("Session resumed.");
          return;
        }
      }
    } catch { /* fall through */ }
    toast.error("Could not resume session.");
    clearLsDraft();
  }

  function discardDraft() {
    clearLsDraft();
    setLsDraft(null);
  }

  // Feature 3: filtered exercises for picker
  const filteredExercises = allExercises.filter((ex) => {
    const nameMatch = ex.name.toLowerCase().includes(exSearch.toLowerCase());
    if (!nameMatch) return false;
    if (muscleFilter === "All") return true;
    const allowed = MUSCLE_FILTER_MAP[muscleFilter];
    return allowed.some(
      (mg) => ex.muscleGroup.toUpperCase() === mg || ex.category.toUpperCase() === mg
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  async function startSession(body: Record<string, string | undefined>) {
    setReadyToStart(false);
    setLoading(true);
    const res = await fetch("/api/workout/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const s = await res.json();
    if (s && Array.isArray(s.exercises)) { setSession(s); initInputs(s); saveSessionState(s.id, {}); }
    setLoading(false);
  }

  if (readyToStart && !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <Dumbbell className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ready to train?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start a blank session, use a template, or pick a program.</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={() => startSession({})}>Start Blank Session</Button>
          <Button variant="outline" onClick={() => setShowTemplatePicker((v) => !v)}>
            {showTemplatePicker ? "Hide Templates" : "Use a Template"}
          </Button>
          <Link href="/workout/programs">
            <Button variant="outline">Pick a Program</Button>
          </Link>
        </div>
        {showTemplatePicker && (
          <div className="w-full max-w-sm space-y-2 text-left">
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">No templates saved yet.</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => startSession({ templateId: t.id, name: t.name })}
                  className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.exercises.map((e) => e.exercise.name).join(", ")}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  if (!session && !summary) return <p className="text-sm text-gray-500">Could not start session.</p>;

  // Feature 2: show summary overlay
  if (summary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workout Complete! 🎉</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{summary.sessionName}</p>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.durationMinutes}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">minutes</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSets}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">sets</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalVolumeLb.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">lb volume</p>
              </div>
            </div>

            {/* PRs hit */}
            {summary.prsHit.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">🏆 Personal Records</p>
                <ul className="space-y-1">
                  {summary.prsHit.map((pr, i) => (
                    <li key={i} className="text-sm text-amber-700 dark:text-amber-400">{pr}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exercises */}
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Exercises</p>
              <ul className="space-y-1">
                {summary.exercises.map((ex, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">{ex.name}</span>
                    <span className="text-gray-400 dark:text-gray-500">{ex.setsCompleted} set{ex.setsCompleted !== 1 ? "s" : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => dismissSummary(false)}>
              Done
            </Button>
            <Button className="flex-1" onClick={() => dismissSummary(true)}>
              View Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);
  const completedSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);

  // Group exercises by superset group
  const supersetColors = ["bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800", "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800", "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800"];

  return (
    <div className="space-y-6">
      {/* Feature 4: localStorage draft resume banner */}
      {lsDraft && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You have an unfinished workout from {timeAgo(lsDraft.savedAt)} ({lsDraft.exerciseCount} exercise{lsDraft.exerciseCount !== 1 ? "s" : ""}). Resume?
          </p>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={discardDraft}>Discard</Button>
            <Button size="sm" className="h-7 text-xs" onClick={resumeFromDraft}>Resume</Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/workout" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session.name ?? "Workout"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{completedSets}/{totalSets} sets completed</p>
          <div className="mt-1.5">
            {editingSessionNotes ? (
              <input
                autoFocus
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-64 focus:outline-none focus:ring-1 focus:ring-gray-400"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Session notes..."
                onBlur={() => { setEditingSessionNotes(false); saveSessionNotes(sessionNotes); }}
                onKeyDown={(e) => { if (e.key === "Enter") { setEditingSessionNotes(false); saveSessionNotes(sessionNotes); } }}
              />
            ) : (
              <button
                onClick={() => setEditingSessionNotes(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {sessionNotes ? sessionNotes : "Add session note"}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimerEnabled((v) => { localStorage.setItem("timer_enabled", String(!v)); return !v; })}
            className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md border transition-colors ${timerEnabled ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300" : "border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"}`}
            title={timerEnabled ? "Disable rest timer" : "Enable rest timer"}
          >
            <Timer className="h-3.5 w-3.5" />
            {timerEnabled ? "Timer on" : "Timer off"}
          </button>
          <Button onClick={finishSession} disabled={completing} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {completing ? "Saving..." : "Finish"}
          </Button>
        </div>
      </div>

      {/* Offline / pending sync indicator */}
      {(!isOnline || pendingSync.length > 0) && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            {!isOnline
              ? `Offline — ${pendingSync.length > 0 ? `${pendingSync.length} set${pendingSync.length !== 1 ? "s" : ""} queued` : "sets saved locally"}`
              : isSyncing
                ? `Syncing ${pendingSync.length} set${pendingSync.length !== 1 ? "s" : ""}…`
                : `${pendingSync.length} set${pendingSync.length !== 1 ? "s" : ""} not yet saved — tap to sync`}
          </div>
          {isOnline && !isSyncing && pendingSync.length > 0 && (
            <button
              onClick={drainSyncQueue}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Sync now
            </button>
          )}
        </div>
      )}

      {/* Rest Timer */}
      {timer.running && (
        <Card className="bg-gray-900 text-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-300">{timerLabel}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {Math.floor(timer.seconds / 60)}:{String(timer.seconds % 60).padStart(2, "0")}
                  </p>
                </div>
              </div>
              <Button variant="ghost" className="text-white hover:text-gray-300" onClick={timer.stop}>Skip</Button>
            </div>
            <div className="flex gap-2 mt-3">
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  onClick={() => timer.start(s)}
                  className="flex-1 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-xs py-1.5 font-medium transition-colors"
                >
                  {s < 60 ? `${s}s` : `${s / 60}min`}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {session.exercises.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-400">No exercises loaded. Add some below.</p>
          </CardContent>
        </Card>
      )}

      {session.exercises.map((ex) => {
        const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
        const hint = overloadHints[ex.id];
        const lastSession = lastSessions[ex.id] ?? null;
        const supersetClass = ex.supersetGroup != null ? supersetColors[(ex.supersetGroup - 1) % supersetColors.length] : "";

        return (
          <Card key={ex.id} className={`${allDone ? "opacity-75" : ""} ${ex.supersetGroup != null ? `border-2 ${supersetClass}` : ""}`}>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {ex.exercise.name}
                  {allDone && <Badge className="text-xs gap-1"><Check className="h-3 w-3" />Done</Badge>}
                  {ex.supersetGroup != null && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Link2 className="h-3 w-3" />
                      Superset {ex.supersetGroup}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{muscleLabel(ex.exercise.muscleGroup)}</p>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={() => {
                    if (ex.supersetGroup != null) {
                      setSupersetGroup(ex, null);
                      setSupersetPickerFor(null);
                    } else {
                      const existingGroups = [...new Set(session.exercises.map(e => e.supersetGroup).filter((g): g is number => g != null))];
                      if (existingGroups.length === 0) {
                        setSupersetGroup(ex, 1);
                      } else {
                        setSupersetPickerFor(supersetPickerFor === ex.id ? null : ex.id);
                      }
                    }
                  }}
                  className={`p-1.5 transition-colors ${ex.supersetGroup != null ? "text-blue-500 hover:text-gray-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                  title={ex.supersetGroup != null ? "Remove from superset" : "Add to superset"}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setEditingNotes((prev) => ({ ...prev, [ex.id]: !prev[ex.id] })); setNotesDraft((prev) => ({ ...prev, [ex.id]: ex.notes ?? "" })); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="Edit notes"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeExercise(ex.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove exercise"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            {supersetPickerFor === ex.id && (
              <div className="mx-6 mb-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Join superset:</span>
                {[...new Set(session.exercises.map(e => e.supersetGroup).filter((g): g is number => g != null))].map(g => (
                  <button
                    key={g}
                    onClick={() => { setSupersetGroup(ex, g); setSupersetPickerFor(null); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${supersetColors[(g - 1) % supersetColors.length]} hover:opacity-80`}
                  >
                    Group {g}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const next = Math.max(0, ...session.exercises.map(e => e.supersetGroup ?? 0)) + 1;
                    setSupersetGroup(ex, next);
                    setSupersetPickerFor(null);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-500 transition-colors"
                >
                  + New group
                </button>
                <button onClick={() => setSupersetPickerFor(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Cancel</button>
              </div>
            )}
            <CardContent className="pt-0 space-y-3">
              {/* Overload hint */}
              {hint && (
                <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg px-3 py-2">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800 dark:text-green-200">
                    Suggestion: <strong>{hint.weightLb} lb × {hint.reps}</strong>
                  </p>
                </div>
              )}

              {/* Last session reference */}
              {lastSession && lastSession.sets.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 space-y-0.5">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    Last time · {formatDate(lastSession.date, { month: "short", day: "numeric" })}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {lastSession.sets.map((s) => (
                      <span key={s.setNumber} className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                        {s.weightLb != null && s.reps != null
                          ? `${s.weightLb} lb × ${s.reps}`
                          : s.durationSeconds != null
                          ? `${Math.round(s.durationSeconds / 60)} min`
                          : "—"}
                      </span>
                    ))}
                  </div>
                  {lastSession.notes && (
                    <p className="text-xs text-gray-400 italic mt-0.5">Last note: {lastSession.notes}</p>
                  )}
                </div>
              )}

              {/* Notes editing */}
              {editingNotes[ex.id] && (
                <div className="flex gap-2">
                  <Input
                    value={notesDraft[ex.id] ?? ""}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                    placeholder="Exercise notes..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" className="h-8 shrink-0" onClick={() => saveExerciseNotes(ex)}>Save</Button>
                </div>
              )}

              {isCardio(ex) ? (
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1 px-1">
                  <span>Set</span><span>Duration (min)</span><span></span>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1 px-1">
                  <span>Set</span><span>Reps</span><span>Weight (lb)</span><span>RPE</span><span></span>
                </div>
              )}
              <div className="space-y-2">
                {ex.sets.map((set) => {
                  const key = setKey(ex.id, set.setNumber);
                  const input = setInputs[key] ?? { reps: "", weight: "", rpe: "", duration: "" };
                  const cardio = isCardio(ex);
                  return (
                    <div key={set.setNumber} className={`grid ${cardio ? "grid-cols-3" : "grid-cols-5"} gap-2 items-center ${set.completed ? "opacity-50" : ""}`}>
                      <span className="text-sm font-medium tabular-nums">{set.setNumber}</span>
                      {cardio ? (
                        <Input
                          type="number"
                          placeholder="min"
                          value={input.duration}
                          disabled={set.completed}
                          onChange={(e) => setSetInputs((prev) => ({ ...prev, [key]: { ...input, duration: e.target.value } }))}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <>
                          <Input
                            type="number"
                            placeholder="reps"
                            value={input.reps}
                            disabled={set.completed}
                            onChange={(e) => setSetInputs((prev) => ({ ...prev, [key]: { ...input, reps: e.target.value } }))}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            placeholder="lb"
                            value={input.weight}
                            disabled={set.completed}
                            onChange={(e) => setSetInputs((prev) => ({ ...prev, [key]: { ...input, weight: e.target.value } }))}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            placeholder="1-10"
                            value={input.rpe}
                            disabled={set.completed}
                            min={1}
                            max={10}
                            onChange={(e) => setSetInputs((prev) => ({ ...prev, [key]: { ...input, rpe: e.target.value } }))}
                            className="h-8 text-sm"
                          />
                        </>
                      )}
                      <Button
                        size="sm"
                        variant={set.completed ? "secondary" : "default"}
                        className="h-8 w-full"
                        disabled={set.completed}
                        onClick={() => completeSet(ex, set)}
                      >
                        {set.completed ? <Check className="h-4 w-4" /> : "Done"}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => addSet(ex)}
                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Plus className="h-3 w-3" />Add set
              </button>
              {!editingNotes[ex.id] && ex.notes && (
                <p className="text-xs text-gray-400 border-t pt-2">{ex.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" className="w-full gap-2" onClick={openPicker}>
        <Plus className="h-4 w-4" />Add Exercise
      </Button>

      {/* Exercise picker modal — Feature 3: search + muscle group filter */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Exercise</h2>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search exercises..." value={exSearch} onChange={(e) => setExSearch(e.target.value)} className="pl-9" autoFocus />
              </div>
              {/* Muscle group pills */}
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map((mg) => (
                  <button
                    key={mg}
                    onClick={() => setMuscleFilter(mg)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      muscleFilter === mg
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {mg}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800">
              {filteredExercises.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No exercises found.</p>
              ) : (
                filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                    onClick={() => addExerciseToSession(ex)}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{ex.muscleGroup.replace(/_/g, " ")}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pb-8 space-y-2">
        <Button onClick={finishSession} disabled={completing} className="w-full gap-2" size="lg">
          <CheckCircle2 className="h-4 w-4" />
          {completing ? "Saving..." : "Finish Session"}
        </Button>
        <Button variant="outline" onClick={saveAsTemplate} disabled={savingTemplate} className="w-full gap-2" size="sm">
          <BookmarkPlus className="h-4 w-4" />
          {savingTemplate ? "Saving..." : "Save as Template"}
        </Button>
      </div>
    </div>
  );
}
