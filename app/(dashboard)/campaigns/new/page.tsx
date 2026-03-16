"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const CAMPAIGN_TYPES = [
  { value: "WIN_BACK",             label: "Win-Back" },
  { value: "RE_ENGAGEMENT",        label: "Re-Engagement" },
  { value: "LOYALTY_REWARD",       label: "Loyalty Reward" },
  { value: "NEW_CUSTOMER_WELCOME", label: "New Customer Welcome" },
  { value: "PROMOTIONAL",          label: "Promotional" },
];

const SEGMENTS = [
  "VIP", "Loyal Regulars", "New Customers",
  "At Risk", "Inactive", "Churned", "High Value Inactive",
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name:    "",
    type:    "",
    channel: "",
    segment: "",
    subject: "",
    body:    "",
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Campaign saved as draft.");
        router.push("/campaigns");
      } else {
        toast.error(data.error ?? "Failed to create campaign.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New campaign</h1>
          <p className="text-sm text-gray-500 mt-1">Saved as draft — review before sending</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign details</CardTitle>
          <CardDescription>Define who you&apos;re sending to and what you&apos;re saying</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Campaign name</Label>
              <Input
                placeholder="e.g. Summer win-back"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select onValueChange={(v) => set("type", String(v))} required>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select onValueChange={(v) => set("channel", String(v))} required>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target segment</Label>
              <Select onValueChange={(v) => set("segment", String(v))} required>
                <SelectTrigger><SelectValue placeholder="Select segment…" /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.channel === "EMAIL" && (
              <div className="space-y-2">
                <Label>Subject line</Label>
                <Input
                  placeholder="We miss you, [first_name]"
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message body</Label>
              <Textarea
                placeholder="Hi [first_name], it's been a while…"
                rows={6}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">
                Use <code className="bg-gray-100 px-1 rounded">[first_name]</code>,{" "}
                <code className="bg-gray-100 px-1 rounded">[business_name]</code>,{" "}
                <code className="bg-gray-100 px-1 rounded">[loyalty_points]</code> as variables.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save as draft"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
