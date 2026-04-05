"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

interface Member {
  id: string;
  name: string | null;
  email: string;
  orgRole: OrgRole;
  createdAt: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: Member[];
}

const ROLES: OrgRole[] = ["OWNER", "ADMIN", "MEMBER"];

export default function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Add member form
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<OrgRole>("MEMBER");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/organizations/${id}`)
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        if (r.status === 404) { return null; }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setOrg(d);
          setNameValue(d.name);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveName() {
    if (!org || !nameValue.trim() || nameValue === org.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update name.");
        return;
      }
      const updated = await res.json();
      setOrg((prev) => prev ? { ...prev, name: updated.name, slug: updated.slug } : prev);
      setEditingName(false);
      toast.success("Organization name updated.");
    } catch {
      toast.error("Failed to update name.");
    } finally {
      setSavingName(false);
    }
  }

  async function changeRole(userId: string, role: OrgRole) {
    try {
      const res = await fetch(`/api/admin/organizations/${id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update role.");
        return;
      }
      const updated = await res.json();
      setOrg((prev) =>
        prev
          ? { ...prev, members: prev.members.map((m) => (m.id === updated.id ? { ...m, orgRole: updated.orgRole } : m)) }
          : prev
      );
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    }
  }

  async function removeMember(userId: string) {
    try {
      const res = await fetch(`/api/admin/organizations/${id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to remove member.");
        return;
      }
      setOrg((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev
      );
      toast.success("Member removed.");
    } catch {
      toast.error("Failed to remove member.");
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/organizations/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, role: addRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to add member.");
        return;
      }
      const member = await res.json();
      setOrg((prev) =>
        prev
          ? { ...prev, members: prev.members.some((m) => m.id === member.id) ? prev.members.map((m) => m.id === member.id ? member : m) : [...prev.members, member] }
          : prev
      );
      setAddEmail("");
      setAddRole("MEMBER");
      toast.success("Member added.");
    } catch {
      toast.error("Failed to add member.");
    } finally {
      setAdding(false);
    }
  }

  if (forbidden) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 dark:text-gray-400">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  if (!loading && !org) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 dark:text-gray-400">Organization not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/organizations" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
        </Link>

        {loading ? (
          <Skeleton className="h-8 w-48" />
        ) : org ? (
          <div className="flex items-center gap-2">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") { setEditingName(false); setNameValue(org.name); }
                  }}
                  onBlur={saveName}
                  autoFocus
                  className="text-2xl font-bold bg-transparent border-b-2 border-indigo-500 text-gray-900 dark:text-white focus:outline-none"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(org.name); }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{org.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ) : null}

        {org && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400 font-mono">{org.slug}</span>
            <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
            <span className="text-xs text-gray-400">
              Created {formatDate(org.createdAt, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        )}
      </div>

      {/* Members table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Members {org ? `(${org.members.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 px-6 pb-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !org || org.members.length === 0 ? (
            <p className="text-sm text-gray-400 px-6 pb-4">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-2">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Email</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-3 py-2">Joined</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {org.members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="px-6 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {member.name ?? <span className="text-gray-400 italic">No name</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{member.email}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={member.orgRole}
                          onChange={(e) => changeRole(member.id, e.target.value as OrgRole)}
                          className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(member.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => removeMember(member.id)}
                          title="Remove member"
                          className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add member form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Add Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMember} className="flex items-center gap-2 flex-wrap">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as OrgRole)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={adding || !addEmail.trim()}>
              {adding ? "Adding…" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
