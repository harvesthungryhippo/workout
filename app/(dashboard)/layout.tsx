import Sidebar from "@/components/layout/Sidebar";

// In production, read from session cookie server-side
// For now using placeholder values — wire to real session later
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        businessName="Your Business"
        userInitials="JD"
        userName="John Doe"
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
