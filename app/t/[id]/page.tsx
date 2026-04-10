"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { Trophy, CheckCircle2, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types (same shape as private API)                                    */
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
  id: string; name: string; description: string | null;
  status: string; sport: string | null; metric: string | null; unit: string | null;
  participants: Participant[]; matches: Match[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function getRoundLabel(round: number, total: number) {
  const d = total - round;
  if (d === 0) return "Final";
  if (d === 1) return "Semifinal";
  if (d === 2) return "Quarterfinal";
  return `Round ${round}`;
}
function groupByRound(matches: Match[]): Match[][] {
  if (!matches.length) return [];
  const max = Math.max(...matches.map((m) => m.round));
  return Array.from({ length: max }, (_, i) =>
    matches.filter((m) => m.round === i + 1).sort((a, b) => a.matchIndex - b.matchIndex)
  );
}

/* ------------------------------------------------------------------ */
/* Match card (read-only)                                              */
/* ------------------------------------------------------------------ */
function MatchCard({ match, unit }: { match: Match; unit: string | null }) {
  const isDone = !!match.winnerId;
  const p1 = match.participant1;
  const p2 = match.participant2;

  function Row({ participant, participantId, score }: { participant: Participant | null; participantId: string | null; score: number | null }) {
    const isWinner = isDone && participantId === match.winnerId;
    const isLoser  = isDone && participantId !== match.winnerId;
    return (
      <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${isWinner ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800" : isLoser ? "opacity-50 bg-gray-50 dark:bg-gray-800/40" : "bg-gray-50 dark:bg-gray-800/40"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isWinner && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          <span className={`text-sm font-medium truncate ${isWinner ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}`}>
            {participant?.name ?? <span className="italic text-gray-400">TBD</span>}
          </span>
        </div>
        {score !== null && <span className="text-xs text-gray-500 shrink-0">{score}{unit ? ` ${unit}` : ""}</span>}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex flex-col gap-1 p-2">
        <Row participant={p1} participantId={match.participant1Id} score={match.score1} />
        <div className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">vs</div>
        <Row participant={p2} participantId={match.participant2Id} score={match.score2} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function PublicBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading]  = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/tournaments/${id}`);
    if (res.ok) { setTournament(await res.json()); setLastUpdated(new Date()); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading bracket…</p>
      </div>
    );
  }
  if (!tournament) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Tournament not found.</p>
      </div>
    );
  }

  const rounds = groupByRound(tournament.matches);
  const totalRounds = rounds.length;
  const isCompleted = tournament.status === "COMPLETED";
  const champion = isCompleted && rounds.length > 0 ? rounds[rounds.length - 1][0]?.winner : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{tournament.name}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isCompleted ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}`}>
                {isCompleted ? "Completed" : "Live"}
              </span>
            </div>
            {(tournament.sport || tournament.description) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {[tournament.sport, tournament.description].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Auto-refreshing</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Champion banner */}
        {champion && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Champion</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{champion.name}</p>
            </div>
          </div>
        )}

        {/* Bracket */}
        {rounds.length > 0 ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {rounds.map((roundMatches, roundIndex) => {
                const round = roundIndex + 1;
                const gapPx = Math.pow(2, roundIndex) * 12;
                const marginTopPx = roundIndex === 0 ? 0 : (Math.pow(2, roundIndex) - 1) * 6;
                return (
                  <div key={round} className="flex flex-col" style={{ minWidth: "180px" }}>
                    <div className="text-center mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {getRoundLabel(round, totalRounds)}
                      </span>
                    </div>
                    <div className="flex flex-col" style={{ gap: `${gapPx}px`, marginTop: `${marginTopPx}px` }}>
                      {roundMatches.map((match) => (
                        <MatchCard key={match.id} match={match} unit={tournament.unit} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-12">Bracket not started yet.</p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 dark:text-gray-600 pt-4">
          Powered by{" "}
          <Link href="https://hungryhippo.fit" className="underline hover:text-gray-500">
            hungryhippo.fit
          </Link>
        </p>
      </div>
    </div>
  );
}
