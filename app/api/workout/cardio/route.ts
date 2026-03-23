import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

// GET /api/workout/cardio — list cardio sessions for the user
async function getSessions(req: AuthedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

    const [sessions, total] = await Promise.all([
      prisma.cardioSession.findMany({
        where: { userId: req.session.userId },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cardioSession.count({ where: { userId: req.session.userId } }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
  } catch (e) {
    console.error("[cardio GET] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/workout/cardio — save a completed cardio session
const createSchema = z.object({
  type: z.enum(["running", "walking"]),
  equipment: z.enum(["outdoor", "treadmill"]).optional(),
  treadmillMode: z.string().optional(),
  inclinePercent: z.number().min(0).max(30).optional(),
  speedKmh: z.number().min(0).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  distanceMeters: z.number().min(0).optional(),
  calories: z.number().int().min(0).optional(),
  avgPaceSecPerKm: z.number().min(0).optional(),
  avgHeartRate: z.number().int().min(0).optional(),
  maxHeartRate: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  route: z.array(z.object({ lat: z.number(), lng: z.number(), ts: z.number() })).optional(),
});

async function createSession(req: AuthedRequest) {
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request.", details: e }, { status: 400 });
  }

  try {
    const session = await prisma.cardioSession.create({
      data: {
        userId: req.session.userId,
        type: body.type,
        equipment: body.equipment,
        treadmillMode: body.treadmillMode,
        inclinePercent: body.inclinePercent,
        speedKmh: body.speedKmh,
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        durationSeconds: body.durationSeconds,
        distanceMeters: body.distanceMeters,
        calories: body.calories,
        avgPaceSecPerKm: body.avgPaceSecPerKm,
        avgHeartRate: body.avgHeartRate,
        maxHeartRate: body.maxHeartRate,
        notes: body.notes,
        route: body.route ?? undefined,
      },
    });
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    console.error("cardio session create error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const GET = withAuth(getSessions);
export const POST = withAuth(createSession);
