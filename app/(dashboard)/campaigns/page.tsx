"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  channel: string;
  segment: string;
  sentAt: string | null;
  _count: { sends: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENT:      "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, []);

  async function sendCampaign(id: string) {
    setSending(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Sent to ${data.sent} recipients.`);
        setCampaigns((prev) =>
          prev.map((c) => c.id === id ? { ...c, status: "SENT" } : c)
        );
      } else {
        toast.error(data.error ?? "Send failed.");
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your customer messages</p>
        </div>
        <Link href="/campaigns/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />New campaign
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm text-gray-400">No campaigns yet.</p>
              <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "outline" }))}>
                Create your first campaign
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Segment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sends</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{c.type.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{c.channel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.segment}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ""}`}>
                        {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c._count.sends}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "DRAFT" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          disabled={sending === c.id}
                          onClick={() => sendCampaign(c.id)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {sending === c.id ? "Sending…" : "Send"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
