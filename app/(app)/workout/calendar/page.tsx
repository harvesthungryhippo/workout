"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
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

interface DayMap {
  [key: string]: { count: number; volume: number };
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

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [dayMap, setDayMap] = useState<DayMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Fetch stats for the past year to get dayMap
    fetch("/api/workout/stats?days=365")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setDayMap(d.dayMap ?? {}); setSessions(d.recentSessions ?? []); }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // day of week (0=Sun) of first
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) cells.push(null);
    else cells.push(new Date(year, month, dayNum));
  }

  const selectedSessions = selectedDay
    ? sessions.filter((s) => s.startedAt.slice(0, 10) === selectedDay)
    : [];

  const isFuture = (d: Date) => d > today;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View workouts by date.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{MONTHS[month]} {year}</CardTitle>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
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
                        relative aspect-square flex flex-col items-center justify-start p-1 rounded-lg text-xs transition-colors
                        ${isSelected ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" :
                          isToday ? "border-2 border-gray-900 dark:border-white" :
                          data ? "bg-green-50 dark:bg-green-950 hover:bg-green-100" :
                          "hover:bg-gray-50 dark:hover:bg-gray-800"}
                        ${future ? "opacity-30 cursor-default" : "cursor-pointer"}
                      `}
                    >
                      <span className={`font-medium leading-none ${isToday && !isSelected ? "text-gray-900 dark:text-white" : ""}`}>
                        {day.getDate()}
                      </span>
                      {data && (
                        <div className="flex flex-col items-center mt-0.5 gap-0.5">
                          {Array.from({ length: Math.min(data.count, 3) }).map((_, j) => (
                            <div key={j} className={`h-1 w-1 rounded-full ${isSelected ? "bg-white dark:bg-gray-900" : "bg-green-500"}`} />
                          ))}
                        </div>
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
            <CardTitle className="text-base">
              {new Date(selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSessions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400 mb-3">No workouts logged.</p>
                <Link href={`/workout/log`}>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Dumbbell className="h-4 w-4" /> Log workout
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name ?? "Workout"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.exerciseCount} exercises
                        {s.volume > 0 && ` · ${formatVolume(s.volume)}`}
                        {formatDuration(s.durationSeconds)}
                      </p>
                    </div>
                    {s.completedAt ? (
                      <Badge variant="secondary" className="text-xs">Completed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">In progress</Badge>
                    )}
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
