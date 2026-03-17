"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Dumbbell, Calendar, BarChart2, BookOpen, Play, LogOut, Scale, Bookmark, Calculator } from "lucide-react";

const NAV = [
  { href: "/workout",             label: "Dashboard",  icon: Dumbbell },
  { href: "/workout/log",         label: "Log Session", icon: Play },
  { href: "/workout/programs",    label: "Programs",   icon: Calendar },
  { href: "/workout/templates",   label: "Templates",  icon: Bookmark },
  { href: "/workout/exercises",   label: "Exercises",  icon: BookOpen },
  { href: "/workout/progress",    label: "Progress",   icon: BarChart2 },
  { href: "/workout/body",        label: "Body",       icon: Scale },
  { href: "/workout/1rm",         label: "1RM Calc",   icon: Calculator },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-white shrink-0">
      <div className="flex h-16 items-center border-b px-5">
        <span className="text-lg font-bold tracking-tight">Workout</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/workout" ? pathname === "/workout" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
