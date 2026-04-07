"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ImportResult {
  sessionsCreated: number;
  setsImported: number;
  skippedExercises: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) { toast.error("Only .csv files are supported."); return; }
    setFile(f);
    setResult(null);
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/workout/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Import failed."); return; }
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Data</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Import workout sessions from a CSV file.</p>
      </div>

      {/* Success result */}
      {result && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">Import complete!</p>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p><span className="font-medium">{result.sessionsCreated}</span> sessions created</p>
              <p><span className="font-medium">{result.setsImported}</span> sets imported</p>
            </div>
            {result.skippedExercises.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400 text-xs font-medium mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Exercises not found (rows skipped):
                </div>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
                  {result.skippedExercises.map((e) => <li key={e}>• {e}</li>)}
                </ul>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1.5">These exercise names didn&apos;t match the library. Check spelling.</p>
              </div>
            )}
            <Link href="/workout/calendar">
              <Button size="sm" variant="outline">View calendar</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Drop zone */}
      <Card>
        <CardContent className="pt-5">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Drop a CSV file here, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Max 5MB · .csv only</p>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{error}</p>}

          {file && (
            <Button onClick={handleImport} disabled={importing} className="w-full mt-4">
              {importing ? "Importing…" : "Import sessions"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Format guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Expected CSV format</CardTitle>
          <CardDescription className="text-xs">Must match the format exported from this app, or any compatible CSV with these columns:</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 block overflow-x-auto whitespace-nowrap text-gray-600 dark:text-gray-400">
            Date, Session Name, Exercise, Muscle Group, Set #, Reps, Weight (lb), RPE, Completed
          </code>
          <ul className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1">
            <li>• Exercise names must match the exercise library exactly</li>
            <li>• Weight should be in <strong>pounds</strong> (converted automatically)</li>
            <li>• Completed: &quot;Yes&quot; or &quot;No&quot;</li>
            <li>• Rows with unrecognized exercises are skipped</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-1">Don&apos;t have a CSV? Export your existing data first:</p>
            <Link href="/workout/export">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Go to Export
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
