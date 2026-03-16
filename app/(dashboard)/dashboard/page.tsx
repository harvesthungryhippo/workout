"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, AlertTriangle, Megaphone } from "lucide-react";
import Link from "next/link";

interface SegmentData {
  segment: string;
  count: number;
}

interface DashboardStats {
  totalCustomers: number;
  segments: SegmentData[];
}

function StatCard({
  title, value, description, icon: Icon, href, variant = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  href?: string;
  variant?: "default" | "warning";
}) {
  const content = (
    <Card className={`transition-shadow hover:shadow-md ${href ? "cursor-pointer" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === "warning" ? "text-amber-500" : "text-gray-400"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [atRisk, setAtRisk] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers/segments").then((r) => r.json()),
      fetch("/api/customers/at-risk").then((r) => r.json()),
    ])
      .then(([seg, risk]) => {
        setData(seg);
        setAtRisk((risk.highRisk?.length ?? 0) + (risk.atRisk?.length ?? 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const segmentCount = (name: string) =>
    data?.segments.find((s) => s.segment === name)?.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Customers"
              value={data?.totalCustomers ?? 0}
              description="All time"
              icon={Users}
              href="/customers"
            />
            <StatCard
              title="Active"
              value={segmentCount("Loyal Regulars") + segmentCount("New Customers")}
              description="Loyal regulars + new"
              icon={TrendingUp}
              href="/customers?status=ACTIVE"
            />
            <StatCard
              title="At Risk"
              value={atRisk}
              description="Showing churn signals"
              icon={AlertTriangle}
              href="/customers/at-risk"
              variant={atRisk > 0 ? "warning" : "default"}
            />
            <StatCard
              title="VIP Customers"
              value={segmentCount("VIP")}
              description="Gold tier or $1,000+ spent"
              icon={Megaphone}
              href="/customers?segment=VIP"
            />
          </>
        )}
      </div>

      {/* Segment breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Segments</CardTitle>
            <CardDescription>Live breakdown of your customer base</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.segments.map(({ segment, count }) => (
                  <div key={segment} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{segment}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-800 rounded-full"
                          style={{
                            width: data.totalCustomers
                              ? `${Math.min(100, (count / data.totalCustomers) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                      <Badge variant="secondary" className="tabular-nums w-8 justify-center">
                        {count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Add a customer",       href: "/customers?new=1" },
              { label: "Create a campaign",     href: "/campaigns/new" },
              { label: "View at-risk customers",href: "/customers/at-risk" },
              { label: "View billing",          href: "/billing" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <span>{label}</span>
                <span className="text-gray-400">→</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
