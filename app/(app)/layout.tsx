import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/isAdmin";
import Sidebar, { MobileNav } from "@/components/layout/Sidebar";
import { BackgroundProcessingInit } from "@/components/BackgroundProcessingInit";
import FeedbackWidget from "@/components/FeedbackWidget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const admin = await isAdmin(session.userId);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <BackgroundProcessingInit userId={session.userId} />
      <Sidebar isAdmin={admin} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">{children}</main>
      <MobileNav isAdmin={admin} />
      <FeedbackWidget />
    </div>
  );
}
