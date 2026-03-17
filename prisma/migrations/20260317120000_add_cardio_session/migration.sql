-- CreateTable
CREATE TABLE "CardioSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "calories" INTEGER,
    "avgPaceSecPerKm" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "notes" TEXT,
    "route" JSONB,

    CONSTRAINT "CardioSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardioSession_userId_idx" ON "CardioSession"("userId");

-- CreateIndex
CREATE INDEX "CardioSession_startedAt_idx" ON "CardioSession"("startedAt");
