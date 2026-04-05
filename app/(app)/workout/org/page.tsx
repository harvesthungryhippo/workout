"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Plus, UserMinus, Shield, UserCheck, LogOut, Building2 } from "lucide-react";

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
}

interface OrgData {
  org: Org | null;
  members: Member[];
  myRole: OrgRole;
}

const ROLE_LABELS: Record<OrgRole, string> = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" };
const ROLE_COLORS: Record<OrgRole, string> = {
  OWNER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MEMBER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function OrgPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/workout/org").then((r) => r.json()),
      fetch("/api/auth/profile").then((r) => r.json()),
    ]).then(([orgData, profile]) => {
      setData(orgData);
      setMyId(profile.id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/workout/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); setSaving(false); return; }
    toast.success("Organization created!");
    setData({ org: json.org, members: [], myRole: "OWNER" });
    setCreating(false);
    setOrgName("");
    setSaving(false);
    // Reload to get self in members list
    fetch("/api/workout/org").then((r) => r.json()).then(setData);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch("/api/workout/org/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); setInviting(false); return; }
    toast.success("Member added!");
    setInviteEmail("");
    setInviting(false);
    setData((prev) => prev ? { ...prev, members: [...prev.members, { ...json.member, createdAt: new Date().toISOString() }] } : prev);
  }

  async function removeMember(memberId: string) {
    const res = await fetch("/api/workout/org/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return; }
    toast.success("Member removed.");
    setData((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) } : prev);
  }

  async function changeRole(memberId: string, role: "ADMIN" | "MEMBER") {
    const res = await fetch("/api/workout/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return; }
    toast.success("Role updated.");
    setData((prev) => prev ? { ...prev, members: prev.members.map((m) => m.id === memberId ? { ...m, orgRole: role } : m) } : prev);
  }

  async function leaveOrg() {
    if (!confirm("Are you sure you want to leave this organization?")) return;
    const res = await fetch("/api/workout/org", { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return; }
    toast.success("You left the organization.");
    setData({ org: null, members: [], myRole: "MEMBER" });
  }

  if (loading) return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  // No org — show create form or prompt
  if (!data?.org) return (
    <div className="p-4 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6" /> Organization
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create an organization to manage a team — gym members, a sports club, or training group.
        </p>
      </div>

      {!creating ? (
        <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create organization
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New organization</CardTitle>
            <CardDescription>You&apos;ll be the owner and can invite members by email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOrg} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Organization name</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Iron City Gym"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const canManage = data.myRole === "OWNER" || data.myRole === "ADMIN";

  return (
    <div className="p-4 max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6" /> {data.org.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {data.members.length} member{data.members.length !== 1 ? "s" : ""} · Your role:{" "}
            <span className="font-medium">{ROLE_LABELS[data.myRole]}</span>
          </p>
        </div>
        {data.myRole !== "OWNER" && (
          <Button variant="outline" size="sm" onClick={leaveOrg} className="flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="w-3.5 h-3.5" /> Leave
          </Button>
        )}
      </div>

      {/* Invite */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Invite member</CardTitle>
            <CardDescription>Add someone by their account email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                required
                className="flex-1"
              />
              <Button type="submit" disabled={inviting}>{inviting ? "Adding…" : "Add"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.members.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.name ?? member.email}
                    {member.id === myId && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                  </p>
                  {member.name && <p className="text-xs text-gray-500 truncate">{member.email}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.orgRole]}`}>
                    {ROLE_LABELS[member.orgRole]}
                  </span>
                  {canManage && member.id !== myId && member.orgRole !== "OWNER" && (
                    <>
                      {member.orgRole === "MEMBER" ? (
                        <button
                          onClick={() => changeRole(member.id, "ADMIN")}
                          title="Promote to Admin"
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => changeRole(member.id, "MEMBER")}
                          title="Demote to Member"
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(member.id)}
                        title="Remove member"
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-600"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {data.myRole === "OWNER" && (
        <p className="text-xs text-gray-400">
          To disband the organization, remove all other members first, then leave.
        </p>
      )}
    </div>
  );
}
