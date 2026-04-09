import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth, type AuthedRequest } from "@/lib/api/withAuth";

interface ParsedRow {
  date: string;
  sessionName: string;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  completed: boolean;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Skip header row
  const rows: ParsedRow[] = [];
  for (const line of lines.slice(1)) {
    // Handle quoted CSV fields
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; continue; }
      if (line[i] === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
      cur += line[i];
    }
    cols.push(cur);

    if (cols.length < 7) continue;

    const [date, sessionName, exerciseName, , setNum, reps, weightLb, rpe, completed] = cols;
    // weightKg column stores lb values (misnamed — UI inputs and stores lb throughout)
    const weightKg = weightLb && weightLb !== "" ? parseFloat(weightLb) : null;

    rows.push({
      date: date.trim(),
      sessionName: sessionName.trim() || "Imported Workout",
      exerciseName: exerciseName.trim(),
      setNumber: parseInt(setNum) || 1,
      reps: reps && reps !== "" ? parseInt(reps) : null,
      weightKg: weightKg && !isNaN(weightKg) ? Math.round(weightKg * 100) / 100 : null,
      rpe: rpe && rpe !== "" ? parseInt(rpe) : null,
      completed: completed?.trim().toLowerCase() === "yes",
    });
  }
  return rows;
}

async function importData(req: AuthedRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!file.name.endsWith(".csv")) return NextResponse.json({ error: "Only CSV files are supported." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)." }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: "No valid rows found in CSV." }, { status: 400 });

  // Group rows into sessions by date + session name
  const sessionMap = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const key = `${row.date}|${row.sessionName}`;
    if (!sessionMap.has(key)) sessionMap.set(key, []);
    sessionMap.get(key)!.push(row);
  }

  // Look up or cache exercises by name
  const exerciseCache = new Map<string, string>(); // name -> id
  const allExercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
  for (const ex of allExercises) exerciseCache.set(ex.name.toLowerCase(), ex.id);

  let sessionsCreated = 0;
  let setsImported = 0;
  const skippedExercises = new Set<string>();

  for (const [key, sessionRows] of sessionMap) {
    const [date, name] = key.split("|");
    const startedAt = new Date(date);
    if (isNaN(startedAt.getTime())) continue;

    // Group rows by exercise within this session
    const exerciseMap = new Map<string, ParsedRow[]>();
    for (const row of sessionRows) {
      if (!exerciseMap.has(row.exerciseName)) exerciseMap.set(row.exerciseName, []);
      exerciseMap.get(row.exerciseName)!.push(row);
    }

    const exerciseData: { exerciseId: string; order: number; sets: ParsedRow[] }[] = [];
    let order = 1;
    for (const [exName, exRows] of exerciseMap) {
      const exerciseId = exerciseCache.get(exName.toLowerCase());
      if (!exerciseId) { skippedExercises.add(exName); continue; }
      exerciseData.push({ exerciseId, order: order++, sets: exRows });
    }

    if (exerciseData.length === 0) continue;

    await prisma.workoutSession.create({
      data: {
        userId: req.session.userId,
        name,
        startedAt,
        completedAt: startedAt,
        exercises: {
          create: exerciseData.map(({ exerciseId, order, sets }) => ({
            exerciseId,
            order,
            sets: {
              create: sets.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weightKg: s.weightKg,
                rpe: s.rpe,
                completed: s.completed,
              })),
            },
          })),
        },
      },
    });

    sessionsCreated++;
    setsImported += sessionRows.length;
  }

  return NextResponse.json({
    ok: true,
    sessionsCreated,
    setsImported,
    skippedExercises: Array.from(skippedExercises),
  });
}

export const POST = withAuth(importData);
