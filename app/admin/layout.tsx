import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/isAdmin";
import Link from "next/link";
import { BarChart2, Users, MessageSquare, Building2, ArrowLeft } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart2, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const admin = await isAdmin(session.userId);
  if (!admin) redirect("/workout");

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="hidden md:flex h-screen w-52 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex h-14 items-center border-b border-gray-200 dark:border-gray-800 px-5 gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-gray-800 p-3">
          <Link href="/workout" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
