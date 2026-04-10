"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Plus, Trash2, Play, ArrowLeft, CheckCircle2, ChevronRight, Monitor,
} from "lucide-react";
import Link from "next/link";
import { ShareButton } from "@/components/ShareButton";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Participant {
  id: string;
  name: string;
  seed: number;
}

interface Match {
  id: string;
  round: number;
  matchIndex: number;
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
  score1: number | null;
  score2: number | null;
  participant1: Participant | null;
  participant2: Participant | null;
  winner: Participant | null;
}

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  sport: string | null;
  metric: string | null;
  unit: string | null;
  participants: Participant[];
  matches: Match[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
}

function groupByRound(matches: Match[]): Match[][] {
  if (matches.length === 0) return [];
  const maxRound = Math.max(...matches.map((m) => m.round));
  const rounds: Match[][] = [];
  for (let r = 1; r <= maxRound; r++) {
    rounds.push(matches.filter((m) => m.round === r).sort((a, b) => a.matchIndex - b.matchIndex));
  }
  return rounds;
}

/* ------------------------------------------------------------------ */
/* MatchCard                                                           */
/* ------------------------------------------------------------------ */

function MatchCard({
  match,
  unit,
  canEdit,
  tournamentId,
  onResult,
}: {
  match: Match;
  unit: string | null;
  canEdit: boolean;
  tournamentId: string;
  onResult: (match: Match) => void;
}) {
  const isBye = match.winnerId && (!match.participant1Id || !match.participant2Id);
  const isDone = !!match.winnerId;
  const isReady = !!match.participant1Id && !!match.participant2Id;

  const p1 = match.participant1;
  const p2 = match.participant2;
  const w = match.winnerId;

  function participantRow(
    participant: Participant | null,
    participantId: string | null,
    score: number | null
  ) {
    const isWinner = participantId === w;
    const isLoser = isDone && participantId !== w;
    return (
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors ${
          isWinner
            ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800"
            : isLoser
            ? "opacity-50"
            : "bg-gray-50 dark:bg-gray-800/40"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isWinner && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          <span className={`text-sm font-medium truncate ${isWinner ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}`}>
            {participant ? participant.name : <span className="italic text-gray-400">TBD</span>}
          </span>
        </div>
        {score !== null && (
          <span className="text-xs text-gray-500 shrink-0">
            {score}{unit ? ` ${unit}` : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        isBye ? "border-dashed border-gray-200 dark:border-gray-700 opacity-60" : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex flex-col gap-1 p-2">
        {participantRow(p1, match.participant1Id, match.score1)}
        <div className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">
          vs
        </div>
        {participantRow(p2, match.participant2Id, match.score2)}
      </div>
      {isReady && !isBye && (
        <div className="border-t border-gray-100 dark:border-gray-800 flex">
          {canEdit && (
            <button
              onClick={() => onResult(match)}
              className="flex-1 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {isDone ? "Edit result" : "Enter result"}
            </button>
          )}
          <Link
            href={`/workout/tournaments/${tournamentId}/scoreboard/${match.id}`}
            className={`flex items-center justify-center gap-1 py-1.5 px-3 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${canEdit ? "border-l border-gray-100 dark:border-gray-800" : "flex-1"}`}
            title="Open scoreboard"
          >
            <Monitor className="h-3 w-3" />
            {!canEdit && <span>Scoreboard</span>}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ResultModal                                                         */
/* ------------------------------------------------------------------ */

function ResultModal({
  match,
  unit,
  onClose,
  onSave,
}: {
  match: Match;
  unit: string | null;
  onClose: () => void;
  onSave: (winnerId: string, score1: string, score2: string) => Promise<void>;
}) {
  const [winnerId, setWinnerId] = useState(match.winnerId ?? "");
  const [score1, setScore1] = useState(match.score1?.toString() ?? "");
  const [score2, setScore2] = useState(match.score2?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const p1 = match.participant1;
  const p2 = match.participant2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId) { toast.error("Select a winner."); return; }
    setSaving(true);
    await onSave(winnerId, score1, score2);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {p1?.name} vs {p2?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Winner *</Label>
              <div className="flex flex-col gap-2">
                {[
                  { id: match.participant1Id!, participant: p1 },
                  { id: match.participant2Id!, participant: p2 },
                ].map(({ id, participant }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWinnerId(id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      winnerId === id
                        ? "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {winnerId === id && <CheckCircle2 className="h-4 w-4" />}
                    {participant?.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{p1?.name} score {unit ? `(${unit})` : ""}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="optional"
                  value={score1}
                  onChange={(e) => setScore1(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{p2?.name} score {unit ? `(${unit})` : ""}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="optional"
                  value={score2}
                  onChange={(e) => setScore2(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !winnerId} size="sm">
                {saving ? "Saving…" : "Confirm"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);

  async function load() {
    const res = await fetch(`/api/workout/tournaments/${id}`);
    if (res.ok) {
      setTournament(await res.json());
    } else {
      toast.error("Tournament not found.");
      router.push("/workout/tournaments");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddingParticipant(true);
    const res = await fetch(`/api/workout/tournaments/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      await load();
      toast.success("Participant added.");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to add.");
    }
    setAddingParticipant(false);
  }

  async function removeParticipant(participantId: string) {
    const res = await fetch(
      `/api/workout/tournaments/${id}/participants?participantId=${participantId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await load();
    } else {
      toast.error("Failed to remove.");
    }
  }

  async function startTournament() {
    setStarting(true);
    const res = await fetch(`/api/workout/tournaments/${id}/start`, { method: "POST" });
    if (res.ok) {
      await load();
      toast.success("Tournament started!");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to start.");
    }
    setStarting(false);
  }

  async function saveResult(match: Match, winnerId: string, score1: string, score2: string) {
    const res = await fetch(`/api/workout/tournaments/${id}/matches/${match.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winnerId,
        score1: score1 ? parseFloat(score1) : null,
        score2: score2 ? parseFloat(score2) : null,
      }),
    });
    if (res.ok) {
      setResultMatch(null);
      await load();
      toast.success("Result saved!");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to save.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!tournament) return null;

  const rounds = groupByRound(tournament.matches);
  const totalRounds = rounds.length;
  const isDraft = tournament.status === "DRAFT";
  const isActive = tournament.status === "ACTIVE";
  const isCompleted = tournament.status === "COMPLETED";
  const champion = isCompleted && rounds.length > 0
    ? rounds[rounds.length - 1][0]?.winner
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/workout/tournaments")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All tournaments
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tournament.name}</h1>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isDraft
                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    : isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                }`}
              >
                {isDraft ? "Draft" : isActive ? "Active" : "Completed"}
              </span>
            </div>
            {tournament.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tournament.description}</p>
            )}
            {(tournament.sport || tournament.metric) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[
                  tournament.sport,
                  tournament.metric && `${tournament.metric}${tournament.unit ? ` (${tournament.unit})` : ""}`,
                ].filter(Boolean).join(" · ")}
              </p>
            )}
            </div>
            <ShareButton
              url={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://hungryhippo.fit"}/t/${tournament.id}`}
              title={`${tournament.name} — Tournament Bracket`}
              className="mt-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              label="Share"
            />
          </div>
        </div>
      </div>

      {/* Champion banner */}
      {isCompleted && champion && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Champion</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{champion.name}</p>
          </div>
        </div>
      )}

      {/* DRAFT: participant management */}
      {isDraft && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Participants ({tournament.participants.length})
                </CardTitle>
                {tournament.participants.length >= 2 && (
                  <Button
                    size="sm"
                    onClick={startTournament}
                    disabled={starting}
                    className="gap-2"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {starting ? "Starting…" : "Start Tournament"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add participant form */}
              <form onSubmit={addParticipant} className="flex gap-2">
                <Input
                  placeholder="Participant name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={addingParticipant || !newName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              {/* Participant list */}
              {tournament.participants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Add at least 2 participants to start.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tournament.participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 group">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400 w-5">#{p.seed}</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {p.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tournament.participants.length >= 2 && (
                <p className="text-xs text-gray-400">
                  {tournament.participants.length} participants →{" "}
                  {Math.ceil(Math.log2(Math.max(tournament.participants.length, 2)))}-round bracket
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ACTIVE / COMPLETED: bracket view */}
      {(isActive || isCompleted) && rounds.length > 0 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {rounds.map((roundMatches, roundIndex) => {
              const round = roundIndex + 1;
              const label = getRoundLabel(round, totalRounds);
              // Vertical gap between matches increases each round
              const gapPx = Math.pow(2, roundIndex) * 12;
              const marginTopPx = roundIndex === 0 ? 0 : (Math.pow(2, roundIndex) - 1) * 6;

              return (
                <div key={round} className="flex flex-col" style={{ minWidth: "200px" }}>
                  {/* Round label */}
                  <div className="text-center mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {label}
                    </span>
                  </div>

                  {/* Matches */}
                  <div
                    className="flex flex-col"
                    style={{ gap: `${gapPx}px`, marginTop: `${marginTopPx}px` }}
                  >
                    {roundMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        unit={tournament.unit}
                        canEdit={isActive}
                        tournamentId={tournament.id}
                        onResult={setResultMatch}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result modal */}
      {resultMatch && (
        <ResultModal
          match={resultMatch}
          unit={tournament.unit}
          onClose={() => setResultMatch(null)}
          onSave={(winnerId, score1, score2) =>
            saveResult(resultMatch, winnerId, score1, score2)
          }
        />
      )}
    </div>
  );
}
