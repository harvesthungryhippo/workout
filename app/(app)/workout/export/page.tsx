"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Dumbbell, Utensils, Scale } from "lucide-react";

const EXPORTS = [
  {
    key: "sessions",
    icon: Dumbbell,
    title: "Workout Sessions",
    description: "All sessions with exercises, sets, reps, weights, and RPE.",
    filename: "workout-sessions",
  },
  {
    key: "nutrition",
    icon: Utensils,
    title: "Nutrition Log",
    description: "All logged meals with calories and macros.",
    filename: "nutrition",
  },
  {
    key: "body",
    icon: Scale,
    title: "Body Measurements",
    description: "All body weight, body fat, and measurement entries.",
    filename: "body-measurements",
  },
];

export default function ExportPage() {
  function download(type: string) {
    const a = document.createElement("a");
    a.href = `/api/workout/export?type=${type}`;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Data</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Download your data as CSV files.</p>
      </div>

      <div className="space-y-3">
        {EXPORTS.map(({ key, icon: Icon, title, description }) => (
          <Card key={key}>
            <CardContent className="pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                  <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 ml-4 gap-2" onClick={() => download(key)}>
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">About exports</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-xs leading-relaxed">
            CSV files can be opened in Excel, Google Sheets, or any spreadsheet app. All data is exported for the entire history of your account. Weights are exported in pounds (lb).
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
