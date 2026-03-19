import { Pool } from "pg";

const sql = `
CREATE TABLE IF NOT EXISTS "CardioSession" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "type"             TEXT NOT NULL,
    "equipment"        TEXT,
    "treadmillMode"    TEXT,
    "inclinePercent"   DOUBLE PRECISION,
    "speedKmh"         DOUBLE PRECISION,
    "startedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"      TIMESTAMP(3),
    "durationSeconds"  INTEGER,
    "distanceMeters"   DOUBLE PRECISION,
    "calories"         INTEGER,
    "avgPaceSecPerKm"  DOUBLE PRECISION,
    "avgHeartRate"     INTEGER,
    "maxHeartRate"     INTEGER,
    "notes"            TEXT,
    "route"            JSONB,
    CONSTRAINT "CardioSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CardioSession_userId_idx" ON "CardioSession"("userId");
CREATE INDEX IF NOT EXISTS "CardioSession_startedAt_idx" ON "CardioSession"("startedAt");
`;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await pool.query(sql);
    console.log("CardioSession table created.");
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
