"use client";

import { useEffect } from "react";
import { startBackgroundProcessing, stopBackgroundProcessing } from "./reminderProcessor";

export function useBackgroundProcessing(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    startBackgroundProcessing({ userId, intervalMs: 60_000 });

    return () => {
      stopBackgroundProcessing();
    };
  }, [userId]);
}
