"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Sport theme config                                                  */
/* ------------------------------------------------------------------ */

interface SportTheme {
  emoji: string;
  label: string;
  bg: string;           // full background class
  panel: string;        // participant panel bg
  panelBorder: string;
  accent: string;       // text-* for labels
  scoreText: string;    // huge score digits
  btnAdd: string;       // increment btn style
  btnSub: string;       // decrement btn style
  winnerBtn: string;    // declare winner btn style
  increments: number[];
  unit: string;
}

const THEMES: Record<string, SportTheme> = {
  basketball: {
    emoji: "🏀", label: "Basketball",
    bg: "bg-gradient-to-br from-orange-950 via-stone-950 to-black",
    panel: "bg-orange-950/40", panelBorder: "border-orange-800/40",
    accent: "text-orange-400", scoreText: "text-orange-300",
    btnAdd: "bg-orange-700 hover:bg-orange-600 text-white",
    btnSub: "bg-stone-700 hover:bg-stone-600 text-orange-200",
    winnerBtn: "bg-orange-600 hover:bg-orange-500 text-white",
    increments: [1, 2, 3], unit: "pts",
  },
  soccer: {
    emoji: "⚽", label: "Soccer",
    bg: "bg-gradient-to-br from-green-950 via-emerald-950 to-black",
    panel: "bg-green-950/40", panelBorder: "border-green-800/40",
    accent: "text-green-400", scoreText: "text-green-300",
    btnAdd: "bg-green-700 hover:bg-green-600 text-white",
    btnSub: "bg-stone-700 hover:bg-stone-600 text-green-200",
    winnerBtn: "bg-green-600 hover:bg-green-500 text-white",
    increments: [1], unit: "goals",
  },
  football: {
    emoji: "🏈", label: "Football",
    bg: "bg-gradient-to-br from-emerald-950 via-stone-950 to-black",
    panel: "bg-emerald-950/40", panelBorder: "border-emerald-800/40",
    accent: "text-emerald-400", scoreText: "text-emerald-300",
    btnAdd: "bg-emerald-700 hover:bg-emerald-600 text-white",
    btnSub: "bg-stone-700 hover:bg-stone-600 text-emerald-200",
    winnerBtn: "bg-emerald-600 hover:bg-emerald-500 text-white",
    increments: [1, 2, 3, 6], unit: "pts",
  },
  tennis: {
    emoji: "🎾", label: "Tennis",
    bg: "bg-gradient-to-br from-yellow-950 via-stone-950 to-black",
    panel: "bg-yellow-950/40", panelBorder: "border-yellow-800/40",
    accent: "text-yellow-400", scoreText: "text-yellow-300",
    btnAdd: "bg-yellow-700 hover:bg-yellow-600 text-white",
    btnSub: "bg-stone-700 hover:bg-stone-600 text-yellow-200",
    winnerBtn: "bg-yellow-600 hover:bg-yellow-500 text-black",
    increments: [1], unit: "games",
  },
  volleyball: {
    emoji: "🏐", label: "Volleyball",
    bg: "bg-gradient-to-br from-indigo-950 via-blue-950 to-black",
    panel: "bg-indigo-950/40", panelBorder: "border-indigo-800/40",
    accent: "text-indigo-400", scoreText: "text-indigo-300",
    btnAdd: "bg-indigo-700 hover:bg-indigo-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-indigo-200",
    winnerBtn: "bg-indigo-600 hover:bg-indigo-500 text-white",
    increments: [1], unit: "pts",
  },
  boxing: {
    emoji: "🥊", label: "Boxing",
    bg: "bg-gradient-to-br from-red-950 via-zinc-950 to-black",
    panel: "bg-red-950/40", panelBorder: "border-red-900/40",
    accent: "text-red-400", scoreText: "text-red-300",
    btnAdd: "bg-red-700 hover:bg-red-600 text-white",
    btnSub: "bg-zinc-700 hover:bg-zinc-600 text-red-200",
    winnerBtn: "bg-red-600 hover:bg-red-500 text-white",
    increments: [1, 2, 3], unit: "pts",
  },
  mma: {
    emoji: "🥋", label: "MMA",
    bg: "bg-gradient-to-br from-red-950 via-zinc-950 to-black",
    panel: "bg-red-950/40", panelBorder: "border-red-900/40",
    accent: "text-red-400", scoreText: "text-red-300",
    btnAdd: "bg-red-700 hover:bg-red-600 text-white",
    btnSub: "bg-zinc-700 hover:bg-zinc-600 text-red-200",
    winnerBtn: "bg-red-600 hover:bg-red-500 text-white",
    increments: [1, 2, 3], unit: "pts",
  },
  swimming: {
    emoji: "🏊", label: "Swimming",
    bg: "bg-gradient-to-br from-blue-950 via-cyan-950 to-black",
    panel: "bg-blue-950/40", panelBorder: "border-blue-800/40",
    accent: "text-cyan-400", scoreText: "text-cyan-300",
    btnAdd: "bg-cyan-700 hover:bg-cyan-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-cyan-200",
    winnerBtn: "bg-cyan-600 hover:bg-cyan-500 text-black",
    increments: [1], unit: "",
  },
  powerlifting: {
    emoji: "🏋️", label: "Powerlifting",
    bg: "bg-gradient-to-br from-zinc-900 via-gray-950 to-black",
    panel: "bg-zinc-900/60", panelBorder: "border-yellow-900/40",
    accent: "text-yellow-400", scoreText: "text-yellow-300",
    btnAdd: "bg-yellow-600 hover:bg-yellow-500 text-black",
    btnSub: "bg-zinc-700 hover:bg-zinc-600 text-yellow-200",
    winnerBtn: "bg-yellow-500 hover:bg-yellow-400 text-black",
    increments: [2.5, 5, 10], unit: "kg",
  },
  weightlifting: {
    emoji: "🏋️", label: "Weightlifting",
    bg: "bg-gradient-to-br from-zinc-900 via-gray-950 to-black",
    panel: "bg-zinc-900/60", panelBorder: "border-yellow-900/40",
    accent: "text-yellow-400", scoreText: "text-yellow-300",
    btnAdd: "bg-yellow-600 hover:bg-yellow-500 text-black",
    btnSub: "bg-zinc-700 hover:bg-zinc-600 text-yellow-200",
    winnerBtn: "bg-yellow-500 hover:bg-yellow-400 text-black",
    increments: [1, 2.5, 5], unit: "kg",
  },
  baseball: {
    emoji: "⚾", label: "Baseball",
    bg: "bg-gradient-to-br from-blue-950 via-stone-950 to-black",
    panel: "bg-blue-950/40", panelBorder: "border-blue-900/40",
    accent: "text-blue-400", scoreText: "text-white",
    btnAdd: "bg-blue-700 hover:bg-blue-600 text-white",
    btnSub: "bg-stone-700 hover:bg-stone-600 text-blue-200",
    winnerBtn: "bg-blue-600 hover:bg-blue-500 text-white",
    increments: [1], unit: "runs",
  },
  hockey: {
    emoji: "🏒", label: "Hockey",
    bg: "bg-gradient-to-br from-slate-950 via-blue-950 to-black",
    panel: "bg-slate-900/60", panelBorder: "border-blue-900/40",
    accent: "text-blue-400", scoreText: "text-white",
    btnAdd: "bg-blue-700 hover:bg-blue-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-blue-200",
    winnerBtn: "bg-blue-600 hover:bg-blue-500 text-white",
    increments: [1], unit: "goals",
  },
  running: {
    emoji: "🏃", label: "Running",
    bg: "bg-gradient-to-br from-amber-950 via-stone-950 to-black",
    panel: "bg-amber-950/40", panelBorder: "border-amber-800/40",
    accent: "text-amber-400", scoreText: "text-amber-300",
    btnAdd: "bg-amber-700 hover:bg-amber-600 text-white",
    btnSub: "bg-stone-700 hover:bg-stone-600 text-amber-200",
    winnerBtn: "bg-amber-600 hover:bg-amber-500 text-black",
    increments: [1], unit: "",
  },
  badminton: {
    emoji: "🏸", label: "Badminton",
    bg: "bg-gradient-to-br from-sky-950 via-blue-950 to-black",
    panel: "bg-sky-950/40", panelBorder: "border-sky-800/40",
    accent: "text-sky-400", scoreText: "text-sky-300",
    btnAdd: "bg-sky-700 hover:bg-sky-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-sky-200",
    winnerBtn: "bg-sky-600 hover:bg-sky-500 text-white",
    increments: [1], unit: "pts",
  },
  "ping pong": {
    emoji: "🏓", label: "Ping Pong",
    bg: "bg-gradient-to-br from-orange-950 via-blue-950 to-black",
    panel: "bg-blue-950/40", panelBorder: "border-orange-800/40",
    accent: "text-orange-400", scoreText: "text-orange-300",
    btnAdd: "bg-orange-600 hover:bg-orange-500 text-white",
    btnSub: "bg-blue-900 hover:bg-blue-800 text-orange-200",
    winnerBtn: "bg-orange-600 hover:bg-orange-500 text-white",
    increments: [1], unit: "pts",
  },
  racquetball: {
    emoji: "🎯", label: "Racquetball",
    bg: "bg-gradient-to-br from-violet-950 via-purple-950 to-black",
    panel: "bg-violet-950/40", panelBorder: "border-violet-800/40",
    accent: "text-violet-400", scoreText: "text-violet-300",
    btnAdd: "bg-violet-700 hover:bg-violet-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-violet-200",
    winnerBtn: "bg-violet-600 hover:bg-violet-500 text-white",
    increments: [1], unit: "pts",
  },
  racketball: {
    emoji: "🎯", label: "Racquetball",
    bg: "bg-gradient-to-br from-violet-950 via-purple-950 to-black",
    panel: "bg-violet-950/40", panelBorder: "border-violet-800/40",
    accent: "text-violet-400", scoreText: "text-violet-300",
    btnAdd: "bg-violet-700 hover:bg-violet-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-violet-200",
    winnerBtn: "bg-violet-600 hover:bg-violet-500 text-white",
    increments: [1], unit: "pts",
  },
  "raquet ball": {
    emoji: "🎯", label: "Racquetball",
    bg: "bg-gradient-to-br from-violet-950 via-purple-950 to-black",
    panel: "bg-violet-950/40", panelBorder: "border-violet-800/40",
    accent: "text-violet-400", scoreText: "text-violet-300",
    btnAdd: "bg-violet-700 hover:bg-violet-600 text-white",
    btnSub: "bg-slate-700 hover:bg-slate-600 text-violet-200",
    winnerBtn: "bg-violet-600 hover:bg-violet-500 text-white",
    increments: [1], unit: "pts",
  },
  "table tennis": {
    emoji: "🏓", label: "Table Tennis",
    bg: "bg-gradient-to-br from-orange-950 via-blue-950 to-black",
    panel: "bg-blue-950/40", panelBorder: "border-orange-800/40",
    accent: "text-orange-400", scoreText: "text-orange-300",
    btnAdd: "bg-orange-600 hover:bg-orange-500 text-white",
    btnSub: "bg-blue-900 hover:bg-blue-800 text-orange-200",
    winnerBtn: "bg-orange-600 hover:bg-orange-500 text-white",
    increments: [1], unit: "pts",
  },
};

const DEFAULT_THEME: SportTheme = {
  emoji: "🏆", label: "Tournament",
  bg: "bg-gradient-to-br from-gray-900 via-slate-950 to-black",
  panel: "bg-gray-800/40", panelBorder: "border-gray-700/40",
  accent: "text-blue-400", scoreText: "text-white",
  btnAdd: "bg-blue-700 hover:bg-blue-600 text-white",
  btnSub: "bg-gray-700 hover:bg-gray-600 text-gray-200",
  winnerBtn: "bg-blue-600 hover:bg-blue-500 text-white",
  increments: [1], unit: "",
};

function getTheme(sport: string | null | undefined): SportTheme {
  if (!sport) return DEFAULT_THEME;
  const key = sport.toLowerCase().trim();
  if (THEMES[key]) return THEMES[key];
  for (const [k, t] of Object.entries(THEMES)) {
    if (key.includes(k) || k.includes(key)) return t;
  }
  return DEFAULT_THEME;
}

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Participant { id: string; name: string; seed: number; }

interface Match {
  id: string; round: number; matchIndex: number;
  participant1Id: string | null; participant2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  participant1: Participant | null; participant2: Participant | null;
  winner: Participant | null;
}

interface Tournament {
  id: string; name: string; status: string;
  sport: string | null; unit: string | null;
  matches: Match[];
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = use(params);
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [showDeclare, setShowDeclare] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    const res = await fetch(`/api/workout/tournaments/${id}`);
    if (!res.ok) { toast.error("Tournament not found."); router.push(`/workout/tournaments`); return; }
    const t: Tournament = await res.json();
    setTournament(t);
    const m = t.matches.find((m) => m.id === matchId) ?? null;
    if (!m) { toast.error("Match not found."); router.push(`/workout/tournaments/${id}`); return; }
    setMatch(m);
    if (!silent) {
      setS1(m.score1 ?? 0);
      setS2(m.score2 ?? 0);
    }
  }, [id, matchId, router]);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [load]);

  // Debounced sync to server after score changes
  function scheduleSync(newS1: number, newS2: number) {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async () => {
      await fetch(`/api/workout/tournaments/${id}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score1: newS1, score2: newS2 }),
      });
    }, 400);
  }

  function addScore(player: 1 | 2, amount: number) {
    const newS1 = player === 1 ? Math.max(0, s1 + amount) : s1;
    const newS2 = player === 2 ? Math.max(0, s2 + amount) : s2;
    setS1(newS1);
    setS2(newS2);
    scheduleSync(newS1, newS2);
  }

  async function declareWinner(winnerId: string) {
    setDeclaring(true);
    const res = await fetch(`/api/workout/tournaments/${id}/matches/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId, score1: s1, score2: s2 }),
    });
    if (res.ok) {
      toast.success("Winner declared!");
      router.push(`/workout/tournaments/${id}`);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed.");
      setDeclaring(false);
    }
  }

  if (!tournament || !match) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Loading scoreboard…</p>
      </div>
    );
  }

  const theme = getTheme(tournament.sport ?? tournament.unit);
  const p1 = match.participant1;
  const p2 = match.participant2;
  const isDone = !!match.winnerId;
  const isActive = tournament.status === "ACTIVE";

  const totalRounds = Math.max(...tournament.matches.map((m) => m.round), 1);
  const roundLabel = getRoundLabel(match.round, totalRounds);

  const unitLabel = tournament.unit ?? theme.unit;

  return (
    <div className={`fixed inset-0 z-50 ${theme.bg} flex flex-col`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={() => router.push(`/workout/tournaments/${id}`)}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to bracket</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-lg">{theme.emoji}</span>
          <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>
            {tournament.sport ?? theme.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 uppercase tracking-wider">{roundLabel}</p>
          <p className="text-xs text-white/60 truncate max-w-[140px]">{tournament.name}</p>
        </div>
      </div>

      {/* Main scoreboard */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 overflow-auto py-4">
        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-stretch gap-4">

          {/* Player 1 panel */}
          <div className={`flex-1 flex flex-col items-center gap-4 rounded-2xl border ${theme.panel} ${theme.panelBorder} p-5`}>
            <p className="text-lg sm:text-xl font-bold text-white/90 text-center tracking-wide uppercase">
              {p1?.name ?? "TBD"}
            </p>

            {/* Score */}
            <div className="relative">
              <span className={`font-mono font-black text-8xl sm:text-9xl tabular-nums leading-none ${theme.scoreText} drop-shadow-[0_0_30px_currentColor]`}>
                {s1}
              </span>
              {unitLabel && (
                <span className={`absolute -bottom-5 left-0 right-0 text-center text-xs font-semibold uppercase tracking-widest ${theme.accent}`}>
                  {unitLabel}
                </span>
              )}
            </div>

            {/* Controls */}
            {isActive && !isDone && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="flex gap-2 flex-wrap justify-center">
                  {theme.increments.map((n) => (
                    <button
                      key={n}
                      onClick={() => addScore(1, n)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-transform active:scale-95 ${theme.btnAdd}`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => addScore(1, -theme.increments[0])}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-transform active:scale-95 ${theme.btnSub}`}
                >
                  −{theme.increments[0]}
                </button>
              </div>
            )}

            {/* Winner crown */}
            {isDone && match.winnerId === match.participant1Id && (
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Trophy className="h-5 w-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Winner</span>
              </div>
            )}
          </div>

          {/* VS divider */}
          <div className="flex sm:flex-col items-center justify-center gap-1 shrink-0 px-2">
            <div className="h-px sm:h-full w-full sm:w-px bg-white/10" />
            <span className="text-white/30 font-black text-xl sm:text-2xl tracking-widest px-2 py-1 shrink-0">
              VS
            </span>
            <div className="h-px sm:h-full w-full sm:w-px bg-white/10" />
          </div>

          {/* Player 2 panel */}
          <div className={`flex-1 flex flex-col items-center gap-4 rounded-2xl border ${theme.panel} ${theme.panelBorder} p-5`}>
            <p className="text-lg sm:text-xl font-bold text-white/90 text-center tracking-wide uppercase">
              {p2?.name ?? "TBD"}
            </p>

            {/* Score */}
            <div className="relative">
              <span className={`font-mono font-black text-8xl sm:text-9xl tabular-nums leading-none ${theme.scoreText} drop-shadow-[0_0_30px_currentColor]`}>
                {s2}
              </span>
              {unitLabel && (
                <span className={`absolute -bottom-5 left-0 right-0 text-center text-xs font-semibold uppercase tracking-widest ${theme.accent}`}>
                  {unitLabel}
                </span>
              )}
            </div>

            {/* Controls */}
            {isActive && !isDone && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="flex gap-2 flex-wrap justify-center">
                  {theme.increments.map((n) => (
                    <button
                      key={n}
                      onClick={() => addScore(2, n)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-transform active:scale-95 ${theme.btnAdd}`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => addScore(2, -theme.increments[0])}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-transform active:scale-95 ${theme.btnSub}`}
                >
                  −{theme.increments[0]}
                </button>
              </div>
            )}

            {/* Winner crown */}
            {isDone && match.winnerId === match.participant2Id && (
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Trophy className="h-5 w-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Winner</span>
              </div>
            )}
          </div>
        </div>

        {/* Declare winner section */}
        {isActive && !isDone && p1 && p2 && (
          <div className="w-full max-w-3xl">
            {!showDeclare ? (
              <button
                onClick={() => setShowDeclare(true)}
                className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.98] ${theme.winnerBtn}`}
              >
                <Trophy className="inline h-4 w-4 mr-2 -mt-0.5" />
                Declare Winner
              </button>
            ) : (
              <div className="space-y-2">
                <p className={`text-center text-xs font-semibold uppercase tracking-widest ${theme.accent}`}>
                  Select winner
                </p>
                <div className="flex gap-3">
                  {[
                    { id: match.participant1Id!, participant: p1 },
                    { id: match.participant2Id!, participant: p2 },
                  ].map(({ id: pid, participant }) => (
                    <button
                      key={pid}
                      disabled={declaring}
                      onClick={() => declareWinner(pid)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 ${theme.winnerBtn} flex items-center justify-center gap-2`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {participant.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowDeclare(false)}
                  className="w-full py-2 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Completed state */}
        {isDone && (
          <div className="text-center space-y-1">
            <p className={`text-xs font-semibold uppercase tracking-widest ${theme.accent}`}>Match Complete</p>
            <p className="text-white/50 text-sm">
              {match.winner?.name} advances
            </p>
            <button
              onClick={() => router.push(`/workout/tournaments/${id}`)}
              className={`mt-3 px-6 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${theme.winnerBtn}`}
            >
              Back to bracket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
