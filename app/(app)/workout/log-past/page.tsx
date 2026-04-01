"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

export default function LogPastSessionPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [name, setName] = useState("");

  function start() {
    const startedAt = new Date(`${date}T09:00:00`).toISOString();
    const params = new URLSearchParams({ pastDate: startedAt });
    if (name.trim()) params.set("name", name.trim());
    router.push(`/workout/log?${params.toString()}`);
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <Link
        href="/workout"
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Log a Past Workout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Session name <span className="text-gray-400">(optional)</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Day"
            />
          </div>
          <Button onClick={start} className="w-full" disabled={!date}>
            Start Logging
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
