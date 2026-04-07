"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquare, Bug, Database, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { value: "SUGGESTION", label: "Suggestion", icon: MessageSquare, description: "Feature ideas or improvements" },
  { value: "BUG", label: "Bug report", icon: Bug, description: "Something isn't working correctly" },
  { value: "DATA_CORRECTION", label: "Data issue", icon: Database, description: "Wrong exercise info or data problem" },
] as const;

type FeedbackType = "SUGGESTION" | "BUG" | "DATA_CORRECTION";

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("SUGGESTION");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) { toast.error("Please write at least 10 characters."); return; }
    setSubmitting(true);
    const res = await fetch("/api/workout/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message: message.trim() }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      toast.error("Failed to submit. Try again.");
    }
    setSubmitting(false);
  }

  if (done) return (
    <div className="max-w-lg flex flex-col items-center justify-center py-20 text-center space-y-4">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thanks for your feedback!</h2>
      <p className="text-sm text-gray-500">We read every submission and use it to improve the app.</p>
      <Button variant="outline" onClick={() => { setDone(false); setMessage(""); }}>Send another</Button>
    </div>
  );

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Report a bug, suggest a feature, or flag a data issue.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector */}
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                  type === value
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{TYPES.find((t) => t.value === type)?.description}</p>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <Label>Message</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            placeholder="Describe the issue or idea in detail..."
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 resize-none"
          />
          <p className="text-xs text-gray-400">{message.length}/2000</p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit feedback"}
        </Button>
      </form>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-xs leading-relaxed">
            Your feedback goes directly to the development team. We review all submissions and prioritize based on frequency and impact. You may be contacted at your account email if we need clarification.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
