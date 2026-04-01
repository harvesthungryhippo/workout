"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackItem {
  id: string;
  userEmail: string | null;
  type: "SUGGESTION" | "BUG" | "DATA_CORRECTION";
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminNote: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<FeedbackItem["type"], string> = {
  SUGGESTION: "Suggestion",
  BUG: "Bug",
  DATA_CORRECTION: "Data Fix",
};

const TYPE_COLORS: Record<FeedbackItem["type"], string> = {
  SUGGESTION: "bg-blue-100 text-blue-700",
  BUG: "bg-red-100 text-red-700",
  DATA_CORRECTION: "bg-orange-100 text-orange-700",
};

const STATUS_COLORS: Record<FeedbackItem["status"], string> = {
  OPEN: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

const STATUSES: FeedbackItem["status"][] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function FeedbackCard({ item, onUpdate }: { item: FeedbackItem; onUpdate: (updated: FeedbackItem) => void }) {
  const [adminNote, setAdminNote] = useState(item.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  async function update(patch: Partial<Pick<FeedbackItem, "status" | "adminNote">>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      onUpdate(updated);
      toast.success("Updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${TYPE_COLORS[item.type]}`}>{TYPE_LABELS[item.type]}</Badge>
            <Badge className={`text-xs ${STATUS_COLORS[item.status]}`}>{item.status.replace("_", " ")}</Badge>
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {item.userEmail && (
          <p className="text-xs text-gray-400">{item.userEmail}</p>
        )}

        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{item.message}</p>

        {/* Admin note */}
        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Admin note..."
          rows={2}
          className="text-xs resize-none"
        />

        {/* Status + save */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={item.status}
              onChange={(e) => update({ status: e.target.value as FeedbackItem["status"] })}
              className="w-full appearance-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 pr-7 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-gray-400" />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={saving || adminNote === (item.adminNote ?? "")}
            onClick={() => update({ adminNote: adminNote || null })}
          >
            Save Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type StatusFilter = "ALL" | FeedbackItem["status"];

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("OPEN");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((d) => { if (Array.isArray(d)) setItems(d); })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const filtered = filter === "ALL" ? items : items.filter((i) => i.status === filter);

  const counts: Record<StatusFilter, number> = {
    ALL: items.length,
    OPEN: items.filter((i) => i.status === "OPEN").length,
    IN_PROGRESS: items.filter((i) => i.status === "IN_PROGRESS").length,
    RESOLVED: items.filter((i) => i.status === "RESOLVED").length,
    CLOSED: items.filter((i) => i.status === "CLOSED").length,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">{items.length} total submissions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {s.replace("_", " ")} {counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No feedback in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onUpdate={(updated) => setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
