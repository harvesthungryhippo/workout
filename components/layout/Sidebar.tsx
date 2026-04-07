"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dumbbell, Calendar, BarChart2, BookOpen, Play, LogOut, Scale, Bookmark,
  Calculator, Target, Utensils, Droplets, Moon, Activity, Bell, TrendingUp,
  Download, Upload, Settings, ChevronDown, ChevronRight, Zap, Swords, LayoutGrid, ShieldCheck, Building2, MessageSquare,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function NavGroup({ title, items, pathname }: { title: string; items: { href: string; label: string; icon: React.ElementType }[]; pathname: string }) {
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

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const pinned = [
    { href: "/workout",          label: t.nav.dashboard,  icon: Dumbbell },
    { href: "/workout/log",      label: t.nav.logSession, icon: Play },
    { href: "/workout/progress", label: t.nav.progress,   icon: BarChart2 },
    { href: "/workout/programs", label: t.nav.programs,   icon: BookOpen },
  ];

  const allGroups = [
    {
      title: t.nav.train,
      items: [
        { href: "/workout",              label: t.nav.dashboard,    icon: Dumbbell },
        { href: "/workout/log",          label: t.nav.logSession,   icon: Play },
        { href: "/workout/programs",     label: t.nav.programs,     icon: Dumbbell },
        { href: "/workout/legendary",    label: t.nav.legendary,    icon: Swords },
        { href: "/workout/core-programs",label: t.nav.corePrograms, icon: LayoutGrid },
        { href: "/workout/calendar",     label: t.nav.calendar,     icon: Calendar },
        { href: "/workout/templates",    label: t.nav.templates,    icon: Bookmark },
        { href: "/workout/exercises",    label: t.nav.exercises,    icon: BookOpen },
        { href: "/workout/progress",     label: t.nav.progress,     icon: BarChart2 },
        { href: "/workout/overload",     label: t.nav.overload,     icon: TrendingUp },
        { href: "/workout/goals",        label: t.nav.goals,        icon: Target },
        { href: "/workout/cardio",       label: t.nav.cardio,       icon: Zap },
      ],
    },
    {
      title: t.nav.health,
      items: [
        { href: "/workout/body",      label: t.nav.body,      icon: Scale },
        { href: "/workout/nutrition", label: t.nav.nutrition, icon: Utensils },
        { href: "/workout/water",     label: t.nav.water,     icon: Droplets },
        { href: "/workout/sleep",     label: t.nav.sleep,     icon: Moon },
        { href: "/workout/recovery",  label: t.nav.recovery,  icon: Activity },
      ],
    },
    {
      title: t.nav.tools,
      items: [
        { href: "/workout/1rm",       label: t.nav.oneRM,     icon: Calculator },
        { href: "/workout/reminders", label: t.nav.reminders, icon: Bell },
        { href: "/workout/export",    label: t.nav.export,    icon: Download },
        { href: "/workout/import",    label: "Import",        icon: Upload },
        { href: "/workout/org",       label: "Organization",  icon: Building2 },
        { href: "/workout/feedback",  label: "Feedback",      icon: MessageSquare },
        { href: "/workout/settings",  label: t.nav.settings,  icon: Settings },
      ],
    },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      {/* Full-screen menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 md:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 h-14">
            <span className="text-base font-bold text-gray-900 dark:text-white">Menu</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 text-gray-500 dark:text-gray-400"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {allGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = href === "/workout" ? pathname === "/workout" : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
              >
                <ShieldCheck className="h-5 w-5" />
                Admin
              </Link>
            )}
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              {t.nav.logout}
            </button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {pinned.map(({ href, label, icon: Icon }) => {
          const active = href === "/workout" ? pathname === "/workout" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
                active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-none">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-gray-400 dark:text-gray-500"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </nav>
    </>
  );
}

export default function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const NAV_PRIMARY = [
    { href: "/workout",            label: t.nav.dashboard,  icon: Dumbbell },
    { href: "/workout/log",        label: t.nav.logSession, icon: Play },
    { href: "/workout/programs",   label: t.nav.programs,   icon: Dumbbell },
    { href: "/workout/legendary",     label: t.nav.legendary,     icon: Swords },
    { href: "/workout/core-programs", label: t.nav.corePrograms,  icon: LayoutGrid },
    { href: "/workout/calendar",   label: t.nav.calendar,   icon: Calendar },
    { href: "/workout/templates",  label: t.nav.templates,  icon: Bookmark },
    { href: "/workout/exercises",  label: t.nav.exercises,  icon: BookOpen },
    { href: "/workout/progress",   label: t.nav.progress,   icon: BarChart2 },
    { href: "/workout/overload",   label: t.nav.overload,   icon: TrendingUp },
    { href: "/workout/goals",      label: t.nav.goals,      icon: Target },
    { href: "/workout/cardio",     label: t.nav.cardio,     icon: Zap },
  ];

  const NAV_HEALTH = [
    { href: "/workout/body",      label: t.nav.body,       icon: Scale },
    { href: "/workout/nutrition", label: t.nav.nutrition,  icon: Utensils },
    { href: "/workout/water",     label: t.nav.water,      icon: Droplets },
    { href: "/workout/sleep",     label: t.nav.sleep,      icon: Moon },
    { href: "/workout/recovery",  label: t.nav.recovery,   icon: Activity },
  ];

  const NAV_TOOLS = [
    { href: "/workout/1rm",       label: t.nav.oneRM,      icon: Calculator },
    { href: "/workout/reminders", label: t.nav.reminders,  icon: Bell },
    { href: "/workout/export",    label: t.nav.export,     icon: Download },
    { href: "/workout/settings",  label: t.nav.settings,   icon: Settings },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex h-screen w-56 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <div className="flex h-14 items-center border-b border-gray-200 dark:border-gray-800 px-5">
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Workout</span>
      </div>
      <nav className="flex-1 space-y-3 px-3 py-3 overflow-y-auto">
        <NavGroup title={t.nav.train} items={NAV_PRIMARY} pathname={pathname} />
        <NavGroup title={t.nav.health} items={NAV_HEALTH} pathname={pathname} />
        <NavGroup title={t.nav.tools} items={NAV_TOOLS} pathname={pathname} />
      </nav>
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-1">
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
        <ThemeToggle />
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t.nav.logout}
        </button>
      </div>
    </aside>
  );
}
