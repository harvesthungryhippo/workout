"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dumbbell, Calendar, BarChart2, BookOpen, Play, LogOut, Scale, Bookmark,
  Calculator, Target, Utensils, Droplets, Moon, Activity, Bell, TrendingUp,
  Download, Settings, ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";

const NAV_PRIMARY = [
  { href: "/workout",           label: "Dashboard",  icon: Dumbbell },
  { href: "/workout/log",       label: "Log Session", icon: Play },
  { href: "/workout/programs",  label: "Programs",   icon: Dumbbell },
  { href: "/workout/calendar",  label: "Calendar",   icon: Calendar },
  { href: "/workout/templates", label: "Templates",  icon: Bookmark },
  { href: "/workout/exercises", label: "Exercises",  icon: BookOpen },
  { href: "/workout/progress",  label: "Progress",   icon: BarChart2 },
  { href: "/workout/overload",  label: "Overload",   icon: TrendingUp },
  { href: "/workout/goals",     label: "Goals",      icon: Target },
  { href: "/workout/cardio",    label: "Cardio",     icon: Zap },
];

const NAV_HEALTH = [
  { href: "/workout/body",      label: "Body",       icon: Scale },
  { href: "/workout/nutrition", label: "Nutrition",  icon: Utensils },
  { href: "/workout/water",     label: "Water",      icon: Droplets },
  { href: "/workout/sleep",     label: "Sleep",      icon: Moon },
  { href: "/workout/recovery",  label: "Recovery",   icon: Activity },
];

const NAV_TOOLS = [
  { href: "/workout/1rm",       label: "1RM Calc",   icon: Calculator },
  { href: "/workout/reminders", label: "Reminders",  icon: Bell },
  { href: "/workout/export",    label: "Export",     icon: Download },
  { href: "/workout/settings",  label: "Settings",   icon: Settings },
];

function NavGroup({ title, items, pathname }: { title: string; items: typeof NAV_PRIMARY; pathname: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {title}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/workout" ? pathname === "/workout" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <div className="flex h-14 items-center border-b border-gray-200 dark:border-gray-800 px-5">
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Workout</span>
      </div>
      <nav className="flex-1 space-y-3 px-3 py-3 overflow-y-auto">
        <NavGroup title="Train" items={NAV_PRIMARY} pathname={pathname} />
        <NavGroup title="Health" items={NAV_HEALTH} pathname={pathname} />
        <NavGroup title="Tools" items={NAV_TOOLS} pathname={pathname} />
      </nav>
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-1">
        <ThemeToggle />
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
