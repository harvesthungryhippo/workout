import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Sidebar, { MobileNav } from "@/components/layout/Sidebar";
import { BackgroundProcessingInit } from "@/components/BackgroundProcessingInit";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <BackgroundProcessingInit userId={session.userId} />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">{children}</main>
      <MobileNav />
    </div>
  );
}
