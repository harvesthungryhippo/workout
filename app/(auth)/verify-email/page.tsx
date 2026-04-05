"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => setStatus(r.ok ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") return <p className="text-sm text-gray-500">Verifying…</p>;
  if (status === "success") return (
    <div className="space-y-4">
      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        Email verified! You can now sign in.
      </p>
      <Link href="/login" className="block w-full text-center bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 transition-colors">
        Sign in
      </Link>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        Invalid or expired verification link.
      </p>
      <p className="text-sm text-center text-gray-500 dark:text-gray-400">
        <Link href="/login" className="text-gray-900 dark:text-white font-medium hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify email</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Confirming your email address.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
