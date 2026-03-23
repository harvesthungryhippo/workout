"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Dumbbell, RotateCcw, Pencil } from "lucide-react";
import Link from "next/link";

interface SessionSummary {
  id: string;
  name: string | null;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  exerciseCount: number;
  volume: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatVolume(lb: number) {
  if (lb >= 1000) return `${(lb / 1000).toFixed(1)}k lb`;
  return `${Math.round(lb)} lb`;
}

function formatDuration(s: number | null) {
  if (!s) return "";
  return ` · ${Math.floor(s / 60)}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(toKey(today));

  const fetchMonth = useCallback((y: number, m: number) => {
    setLoading(true);
    const from = new Date(y, m, 1).toISOString();
    const to = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/workout/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.sessions) {
          // Flatten session data into a summary shape
          setSessions(d.sessions.map((s: SessionSummary & { exercises?: { sets?: unknown[] }[] }) => ({
            id: s.id,
            name: s.name,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            durationSeconds: s.durationSeconds,
            exerciseCount: s.exercises?.length ?? s.exerciseCount ?? 0,
            volume: s.volume ?? 0,
          })));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

  function prevMonth() {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setYear(newYear); setMonth(newMonth); setSelectedDay(null);
  }

  function nextMonth() {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setYear(newYear); setMonth(newMonth); setSelectedDay(null);
  }

  function goToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth());
    setSelectedDay(toKey(today));
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) cells.push(null);
    else cells.push(new Date(year, month, dayNum));
  }

  // Build dayMap from sessions
  const dayMap: Record<string, { count: number; volume: number }> = {};
  for (const s of sessions) {
    const k = s.startedAt.slice(0, 10);
    if (!dayMap[k]) dayMap[k] = { count: 0, volume: 0 };
    dayMap[k].count++;
    dayMap[k].volume += s.volume ?? 0;
  }

  const selectedSessions = selectedDay
    ? sessions.filter((s) => s.startedAt.slice(0, 10) === selectedDay)
    : [];

  // Month summary
  const monthSessions = sessions.length;
  const monthVolume = sessions.reduce((acc, s) => acc + (s.volume ?? 0), 0);
  const activeDays = Object.keys(dayMap).length;

  const isFuture = (d: Date) => {
    const k = toKey(d);
    return k > toKey(today);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View workouts by date.</p>
      </div>

      {/* Month summary strip */}
      {!loading && monthSessions > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Sessions", value: monthSessions },
            { label: "Active days", value: activeDays },
            { label: "Volume", value: formatVolume(monthVolume) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{MONTHS[month]} {year}</CardTitle>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="px-2 py-1 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const key = toKey(day);
                  const data = dayMap[key];
                  const isToday = key === toKey(today);
                  const isSelected = selectedDay === key;
                  const future = isFuture(day);

                  return (
                    <button
                      key={i}
                      onClick={() => !future && setSelectedDay(isSelected ? null : key)}
                      disabled={future}
                      className={`
                        relative aspect-square flex flex-col items-center justify-start pt-1 pb-0.5 px-0.5 rounded-lg text-xs transition-colors
                        ${isSelected
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                          : isToday
                          ? "ring-2 ring-gray-900 dark:ring-white"
                          : data
                          ? "bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"}
                        ${future ? "opacity-25 cursor-default" : "cursor-pointer"}
                      `}
                    >
                      <span className={`font-medium leading-none text-xs ${isToday && !isSelected ? "text-gray-900 dark:text-white font-bold" : ""}`}>
                        {day.getDate()}
                      </span>
                      {data && (
                        <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(data.count, 3) }).map((_, j) => (
                            <div
                              key={j}
                              className={`h-1 w-1 rounded-full ${isSelected ? "bg-white dark:bg-gray-900" : "bg-green-500"}`}
                            />
                          ))}
                        </div>
                      )}
                      {data && data.count > 1 && !isSelected && (
                        <span className="text-green-600 dark:text-green-400 font-medium" style={{ fontSize: "9px" }}>
                          ×{data.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected day sessions */}
      {selectedDay && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </CardTitle>
              {!isFuture(new Date(selectedDay + "T12:00:00")) && (
                <Link href={`/workout/log?date=${selectedDay}`}>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                    <Dumbbell className="h-3 w-3" /> Log workout
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedSessions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No workouts on this day.</p>
            ) : (
              <div className="divide-y">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3 group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name ?? "Workout"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatTime(s.startedAt)}
                        {s.exerciseCount > 0 && ` · ${s.exerciseCount} exercises`}
                        {s.volume > 0 && ` · ${formatVolume(s.volume)}`}
                        {formatDuration(s.durationSeconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.completedAt ? (
                        <Badge variant="secondary" className="text-xs">Done</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">In progress</Badge>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/workout/log?repeatSessionId=${s.id}${s.name ? `&name=${encodeURIComponent(s.name)}` : ""}`}
                          title="Repeat this session"
                          className="text-gray-300 hover:text-green-600 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/workout/sessions/${s.id}/edit`}
                          title="Edit session"
                          className="text-gray-300 hover:text-gray-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
