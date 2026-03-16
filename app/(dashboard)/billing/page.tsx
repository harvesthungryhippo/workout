"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CreditCard, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface BillingData {
  business: string;
  subscription: {
    plan: string;
    billingCycle: string;
    status: string;
    currentPeriodEnd: string;
    paymentMethodBrand: string | null;
    paymentMethodLast4: string | null;
  } | null;
  totalPaid: string;
  invoices: Array<{
    invoiceNumber: string;
    total: string;
    issuedAt: string;
    isVoided: boolean;
    isCreditNote: boolean;
  }>;
}

const PLAN_PRICES: Record<string, string> = {
  STARTER: "$49/mo",
  GROWTH:  "$149/mo",
  PRO:     "$399/mo",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700",
  PAST_DUE: "bg-red-100 text-red-700",
  PAUSED:   "bg-yellow-100 text-yellow-700",
  CANCELLED:"bg-gray-100 text-gray-600",
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/billing/report?scope=business")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel? Your access continues until the end of your billing period.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error ?? "Cancellation failed.");
      }
    } finally {
      setCancelling(false);
    }
  }

  const sub = data?.subscription;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and payment details</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
          <CardDescription>Your active subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : sub ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold">{sub.plan} plan</p>
                  <p className="text-sm text-gray-500">
                    {PLAN_PRICES[sub.plan]} · {sub.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[sub.status] ?? ""}`}>
                  {sub.status === "PAST_DUE" ? "Past due" : sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Next billing date</span>
                <span className="font-medium">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Payment method</span>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    {sub.paymentMethodBrand && sub.paymentMethodLast4
                      ? `${sub.paymentMethodBrand.charAt(0).toUpperCase()}${sub.paymentMethodBrand.slice(1)} ···· ${sub.paymentMethodLast4}`
                      : "No card on file"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total paid to date</span>
                <span className="font-medium">${data?.totalPaid}</span>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" size="sm">Upgrade plan</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : "Cancel subscription"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No active subscription.</p>
          )}
        </CardContent>
      </Card>

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice history</CardTitle>
          <CardDescription>All your past invoices and credit notes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !data?.invoices.length ? (
            <div className="py-10 text-center text-sm text-gray-400">No invoices yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.invoices.map((inv) => (
                  <tr key={inv.invoiceNumber} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">
                      {inv.isCreditNote ? (
                        <span className="text-red-600">-${Math.abs(Number(inv.total)).toFixed(2)}</span>
                      ) : (
                        `$${Number(inv.total).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.isCreditNote ? "destructive" : inv.isVoided ? "secondary" : "outline"} className="text-xs">
                        {inv.isCreditNote ? "Credit note" : inv.isVoided ? "Voided" : "Invoice"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
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
