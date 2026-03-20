"use client";

import { useBackgroundProcessing } from "@/lib/background/useBackgroundProcessing";

export function BackgroundProcessingInit({ userId }: { userId: string }) {
  useBackgroundProcessing(userId);
  return null;
}
