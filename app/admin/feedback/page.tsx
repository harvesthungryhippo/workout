"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type FeedbackStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type FeedbackType = "SUGGESTION" | "BUG" | "DATA_CORRECTION";

interface Feedback {
  id: string;
  userId: string | null;
  userEmail: string | null;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  OPEN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  RESOLVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CLOSED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  SUGGESTION: "Suggestion",
  BUG: "Bug",
  DATA_CORRECTION: "Data",
};

const STATUSES: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedbackStatus | "ALL">("OPEN");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((r) => r.ok ? r.json() : [])
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: FeedbackStatus) {
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
      toast.success("Status updated.");
    } else {
      toast.error("Failed to update.");
    }
  }

  const filtered = filter === "ALL" ? items : items.filter((f) => f.status === filter);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, items.filter((f) => f.status === s).length]));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback</h1>
        <span className="text-sm text-gray-400">{items.length} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {s === "ALL" ? "All" : s.replace(/_/g, " ")} {s !== "ALL" && counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      {loading ? <Skeleton className="h-64 w-full" /> : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No feedback.</p>
          )}
          {filtered.map((f) => (
            <Card key={f.id} className="cursor-pointer" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[f.status]}`}>
                        {f.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[f.type]}
                      </span>
                      <span className="text-xs text-gray-400">{f.userEmail ?? "anonymous"}</span>
                      <span className="text-xs text-gray-300">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">{f.message}</p>
                  </div>
                </div>

                {expanded === f.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{f.message}</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); updateStatus(f.id, s); }}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
                            f.status === s
                              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                              : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
