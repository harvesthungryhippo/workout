"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { members: number };
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((d) => { if (Array.isArray(d)) setOrgs(d); })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create organization.");
        return;
      }
      const org = await res.json();
      setOrgs((prev) => [org, ...prev]);
      setNewName("");
      setShowForm(false);
      toast.success("Organization created.");
    } catch {
      toast.error("Failed to create organization.");
    } finally {
      setCreating(false);
    }
  }

  if (forbidden) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 dark:text-gray-400">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations</h1>
            <p className="text-sm text-gray-500 mt-1">{loading ? "Loading…" : `${orgs.length} organization${orgs.length !== 1 ? "s" : ""}`}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Organization name"
                autoFocus
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Button type="submit" size="sm" disabled={creating || !newName.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowForm(false); setNewName(""); }}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">No organizations yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <Link key={org.id} href={`/admin/organizations/${org.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950 p-2 shrink-0">
                        <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{org.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3.5 w-3.5" />
                        {org._count.members} member{org._count.members !== 1 ? "s" : ""}
                      </div>
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {formatDate(org.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
