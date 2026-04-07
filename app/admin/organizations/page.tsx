"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Building2 } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { members: number };
}

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then((r) => r.ok ? r.json() : [])
      .then(setOrgs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orgs.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations</h1>
        <span className="text-sm text-gray-400">{orgs.length} total</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9" />
      </div>

      {loading ? <Skeleton className="h-48 w-full" /> : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No organizations yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((org) => (
                <li key={org.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</p>
                    <p className="text-xs text-gray-400">{org.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{org._count.members} members</p>
                    <p className="text-xs text-gray-400">{new Date(org.createdAt).toLocaleDateString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
