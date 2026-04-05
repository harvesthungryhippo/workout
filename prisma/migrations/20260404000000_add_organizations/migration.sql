CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

ALTER TABLE "WorkoutUser" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "WorkoutUser" ADD COLUMN "orgRole" "OrgRole" NOT NULL DEFAULT 'MEMBER';

ALTER TABLE "WorkoutUser" ADD CONSTRAINT "WorkoutUser_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkoutUser_organizationId_idx" ON "WorkoutUser"("organizationId");
