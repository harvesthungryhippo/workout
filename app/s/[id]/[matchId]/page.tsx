"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Trophy, RefreshCw } from "lucide-react";

/* ---- same theme table as the private scoreboard ---- */
interface SportTheme {
  emoji: string; label: string; bg: string; panel: string; panelBorder: string;
  accent: string; scoreText: string; unit: string;
}
const THEMES: Record<string, SportTheme> = {
  basketball: { emoji:"🏀", label:"Basketball", bg:"bg-gradient-to-br from-orange-950 via-stone-950 to-black", panel:"bg-orange-950/40", panelBorder:"border-orange-800/40", accent:"text-orange-400", scoreText:"text-orange-300", unit:"pts" },
  soccer:     { emoji:"⚽", label:"Soccer",      bg:"bg-gradient-to-br from-green-950 via-emerald-950 to-black", panel:"bg-green-950/40", panelBorder:"border-green-800/40", accent:"text-green-400", scoreText:"text-green-300", unit:"goals" },
  football:   { emoji:"🏈", label:"Football",    bg:"bg-gradient-to-br from-emerald-950 via-stone-950 to-black", panel:"bg-emerald-950/40", panelBorder:"border-emerald-800/40", accent:"text-emerald-400", scoreText:"text-emerald-300", unit:"pts" },
  tennis:     { emoji:"🎾", label:"Tennis",      bg:"bg-gradient-to-br from-yellow-950 via-stone-950 to-black", panel:"bg-yellow-950/40", panelBorder:"border-yellow-800/40", accent:"text-yellow-400", scoreText:"text-yellow-300", unit:"games" },
  volleyball: { emoji:"🏐", label:"Volleyball",  bg:"bg-gradient-to-br from-indigo-950 via-blue-950 to-black", panel:"bg-indigo-950/40", panelBorder:"border-indigo-800/40", accent:"text-indigo-400", scoreText:"text-indigo-300", unit:"pts" },
  boxing:     { emoji:"🥊", label:"Boxing",      bg:"bg-gradient-to-br from-red-950 via-zinc-950 to-black", panel:"bg-red-950/40", panelBorder:"border-red-900/40", accent:"text-red-400", scoreText:"text-red-300", unit:"pts" },
  mma:        { emoji:"🥋", label:"MMA",         bg:"bg-gradient-to-br from-red-950 via-zinc-950 to-black", panel:"bg-red-950/40", panelBorder:"border-red-900/40", accent:"text-red-400", scoreText:"text-red-300", unit:"pts" },
  swimming:   { emoji:"🏊", label:"Swimming",    bg:"bg-gradient-to-br from-blue-950 via-cyan-950 to-black", panel:"bg-blue-950/40", panelBorder:"border-blue-800/40", accent:"text-cyan-400", scoreText:"text-cyan-300", unit:"" },
  powerlifting:{ emoji:"🏋️", label:"Powerlifting", bg:"bg-gradient-to-br from-zinc-900 via-gray-950 to-black", panel:"bg-zinc-900/60", panelBorder:"border-yellow-900/40", accent:"text-yellow-400", scoreText:"text-yellow-300", unit:"kg" },
  weightlifting:{ emoji:"🏋️", label:"Weightlifting", bg:"bg-gradient-to-br from-zinc-900 via-gray-950 to-black", panel:"bg-zinc-900/60", panelBorder:"border-yellow-900/40", accent:"text-yellow-400", scoreText:"text-yellow-300", unit:"kg" },
  baseball:   { emoji:"⚾", label:"Baseball",    bg:"bg-gradient-to-br from-blue-950 via-stone-950 to-black", panel:"bg-blue-950/40", panelBorder:"border-blue-900/40", accent:"text-blue-400", scoreText:"text-white", unit:"runs" },
  hockey:     { emoji:"🏒", label:"Hockey",      bg:"bg-gradient-to-br from-slate-950 via-blue-950 to-black", panel:"bg-slate-900/60", panelBorder:"border-blue-900/40", accent:"text-blue-400", scoreText:"text-white", unit:"goals" },
  running:    { emoji:"🏃", label:"Running",     bg:"bg-gradient-to-br from-amber-950 via-stone-950 to-black", panel:"bg-amber-950/40", panelBorder:"border-amber-800/40", accent:"text-amber-400", scoreText:"text-amber-300", unit:"" },
  badminton:  { emoji:"🏸", label:"Badminton",   bg:"bg-gradient-to-br from-sky-950 via-blue-950 to-black", panel:"bg-sky-950/40", panelBorder:"border-sky-800/40", accent:"text-sky-400", scoreText:"text-sky-300", unit:"pts" },
  "ping pong":{ emoji:"🏓", label:"Ping Pong",   bg:"bg-gradient-to-br from-orange-950 via-blue-950 to-black", panel:"bg-blue-950/40", panelBorder:"border-orange-800/40", accent:"text-orange-400", scoreText:"text-orange-300", unit:"pts" },
  "table tennis":{ emoji:"🏓", label:"Table Tennis", bg:"bg-gradient-to-br from-orange-950 via-blue-950 to-black", panel:"bg-blue-950/40", panelBorder:"border-orange-800/40", accent:"text-orange-400", scoreText:"text-orange-300", unit:"pts" },
  racquetball:{ emoji:"🎯", label:"Racquetball", bg:"bg-gradient-to-br from-violet-950 via-purple-950 to-black", panel:"bg-violet-950/40", panelBorder:"border-violet-800/40", accent:"text-violet-400", scoreText:"text-violet-300", unit:"pts" },
  racketball: { emoji:"🎯", label:"Racquetball", bg:"bg-gradient-to-br from-violet-950 via-purple-950 to-black", panel:"bg-violet-950/40", panelBorder:"border-violet-800/40", accent:"text-violet-400", scoreText:"text-violet-300", unit:"pts" },
  "raquet ball":{ emoji:"🎯", label:"Racquetball", bg:"bg-gradient-to-br from-violet-950 via-purple-950 to-black", panel:"bg-violet-950/40", panelBorder:"border-violet-800/40", accent:"text-violet-400", scoreText:"text-violet-300", unit:"pts" },
};
const DEFAULT_THEME: SportTheme = { emoji:"🏆", label:"Tournament", bg:"bg-gradient-to-br from-gray-900 via-slate-950 to-black", panel:"bg-gray-800/40", panelBorder:"border-gray-700/40", accent:"text-blue-400", scoreText:"text-white", unit:"" };

function getTheme(sport: string | null | undefined): SportTheme {
  if (!sport) return DEFAULT_THEME;
  const key = sport.toLowerCase().trim();
  if (THEMES[key]) return THEMES[key];
  for (const [k, t] of Object.entries(THEMES)) {
    if (key.includes(k) || k.includes(key)) return t;
  }
  return DEFAULT_THEME;
}

function getRoundLabel(round: number, total: number) {
  const d = total - round;
  if (d === 0) return "Final";
  if (d === 1) return "Semifinal";
  if (d === 2) return "Quarterfinal";
  return `Round ${round}`;
}

/* ---- Types ---- */
interface Participant { id: string; name: string; }
interface Match {
  id: string; round: number; matchIndex: number;
  participant1Id: string | null; participant2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  participant1: Participant | null; participant2: Participant | null;
  winner: Participant | null;
}
interface Tournament {
  id: string; name: string; status: string; sport: string | null; unit: string | null;
  matches: Match[];
}

export default function PublicScoreboardPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/tournaments/${id}`);
    if (!res.ok) { setLoading(false); return; }
    const t: Tournament = await res.json();
    setTournament(t);
    setMatch(t.matches.find((m) => m.id === matchId) ?? null);
    setLoading(false);
  }, [id, matchId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><p className="text-white animate-pulse">Loading…</p></div>;
  }
  if (!tournament || !match) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><p className="text-white/50">Not found.</p></div>;
  }

  const theme = getTheme(tournament.sport);
  const p1 = match.participant1;
  const p2 = match.participant2;
  const isDone = !!match.winnerId;
  const s1 = match.score1 ?? 0;
  const s2 = match.score2 ?? 0;
  const totalRounds = Math.max(...tournament.matches.map((m) => m.round), 1);
  const roundLabel = getRoundLabel(match.round, totalRounds);
  const unitLabel = tournament.unit ?? theme.unit;

  return (
    <div className={`fixed inset-0 ${theme.bg} flex flex-col`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link href={`/t/${id}`} className="text-sm text-white/40 hover:text-white/70 transition-colors">
          View bracket →
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-lg">{theme.emoji}</span>
          <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>
            {tournament.sport ?? theme.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 uppercase tracking-wider">{roundLabel}</p>
          <div className="flex items-center justify-end gap-1 text-white/30">
            <RefreshCw className="h-2.5 w-2.5" />
            <span className="text-[10px]">live</span>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-stretch gap-4">

          {/* P1 */}
          <div className={`flex-1 flex flex-col items-center gap-4 rounded-2xl border ${theme.panel} ${theme.panelBorder} p-5`}>
            <p className="text-lg sm:text-xl font-bold text-white/90 text-center tracking-wide uppercase">
              {p1?.name ?? "TBD"}
            </p>
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
            {isDone && match.winnerId === match.participant1Id && (
              <div className="flex items-center gap-1.5 text-yellow-400 mt-4">
                <Trophy className="h-5 w-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Winner</span>
              </div>
            )}
          </div>

          {/* VS */}
          <div className="flex sm:flex-col items-center justify-center gap-1 shrink-0 px-2">
            <div className="h-px sm:h-full w-full sm:w-px bg-white/10" />
            <span className="text-white/30 font-black text-xl sm:text-2xl tracking-widest px-2 py-1 shrink-0">VS</span>
            <div className="h-px sm:h-full w-full sm:w-px bg-white/10" />
          </div>

          {/* P2 */}
          <div className={`flex-1 flex flex-col items-center gap-4 rounded-2xl border ${theme.panel} ${theme.panelBorder} p-5`}>
            <p className="text-lg sm:text-xl font-bold text-white/90 text-center tracking-wide uppercase">
              {p2?.name ?? "TBD"}
            </p>
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
            {isDone && match.winnerId === match.participant2Id && (
              <div className="flex items-center gap-1.5 text-yellow-400 mt-4">
                <Trophy className="h-5 w-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Winner</span>
              </div>
            )}
          </div>
        </div>

        {isDone && (
          <div className="text-center space-y-1">
            <p className={`text-xs font-semibold uppercase tracking-widest ${theme.accent}`}>Match Complete</p>
            <p className="text-white/50 text-sm">{match.winner?.name} advances</p>
          </div>
        )}

        <p className="text-white/20 text-xs">
          <Link href="https://hungryhippo.fit" className="hover:text-white/40 transition-colors">hungryhippo.fit</Link>
        </p>
      </div>
    </div>
  );
}
