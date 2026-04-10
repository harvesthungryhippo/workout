import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

async function getTests(req: AuthedRequest) {
  const tests = await prisma.fitnessTest.findMany({
    where: { userId: req.session.userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(tests);
}

async function createTest(req: AuthedRequest) {
  const body = await req.json();
  const { metric, value, unit, notes, date } = body;
  if (!metric || value == null || !unit) {
    return NextResponse.json({ error: "metric, value, and unit are required." }, { status: 400 });
  }
  const test = await prisma.fitnessTest.create({
    data: {
      userId: req.session.userId,
      metric,
      value: parseFloat(value),
      unit,
      notes: notes?.trim() || null,
      date: date ? new Date(date) : new Date(),
    },
  });
  return NextResponse.json(test, { status: 201 });
}

async function deleteTest(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.fitnessTest.deleteMany({ where: { id, userId: req.session.userId } });
  return NextResponse.json({ ok: true });
}

export const GET = withAuth(getTests);
export const POST = withAuth(createTest);
export const DELETE = withAuth(deleteTest);
