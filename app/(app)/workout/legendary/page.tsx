"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Program {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  durationWeeks: number;
  active: boolean;
  days: { id: string; dayNumber: number; name: string; exercises: unknown[] }[];
}

// Metadata for each legendary fighter — matched to seeded program names
const LEGENDARY_FIGHTERS = [
  {
    programName: "Bruce Lee: Jeet Kune Do Conditioning",
    fighter: "Bruce Lee",
    style: "Jeet Kune Do",
    era: "1960s–70s",
    nationality: "Chinese-American",
    difficulty: "Advanced" as const,
    difficultyColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tagline: "Be water, my friend",
    highlights: [
      "Famous two-finger push-ups",
      "Dragon Flag core exercise",
      "Daily wrist roller for forearms",
      "6-day split with daily running",
    ],
    funFact: "Bruce Lee could do 50 one-arm push-ups and his punches were measured at 350 lb·ft/s.",
  },
  {
    programName: "Mike Tyson: Iron Mike's Peak Conditioning",
    fighter: "Mike Tyson",
    style: "Peekaboo Boxing",
    era: "1980s–90s",
    nationality: "American",
    difficulty: "Elite" as const,
    difficultyColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    tagline: "Everyone has a plan until they get punched in the mouth",
    highlights: [
      "4am 6-mile run every day",
      "500+ sit-ups, dips, push-ups daily",
      "Legendary neck bridge training",
      "10+ rounds each: bag, mitts, sparring",
    ],
    funFact: "Tyson trained 7 days a week with no days off. He woke at 4am and went to bed by 9pm throughout camp.",
  },
  {
    programName: "Muhammad Ali: Float Like a Butterfly",
    fighter: "Muhammad Ali",
    style: "Scientific Boxing",
    era: "1960s–70s",
    nationality: "American",
    difficulty: "Advanced" as const,
    difficultyColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tagline: "Float like a butterfly, sting like a bee",
    highlights: [
      "6-mile 6am roadwork every day",
      "Famous Ali Shuffle footwork drill",
      "Floor-to-ceiling ball for hand speed",
      "15-round sparring sessions",
    ],
    funFact: "Ali reportedly threw his Olympic gold medal into the Ohio River after being refused service at a diner due to segregation.",
  },
  {
    programName: "Georges St-Pierre (GSP): The Rush",
    fighter: "Georges St-Pierre",
    style: "MMA (Wrestling / Muay Thai / BJJ)",
    era: "2000s–10s",
    nationality: "Canadian",
    difficulty: "Elite" as const,
    difficultyColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    tagline: "I don't believe in taking shortcuts",
    highlights: [
      "Two-a-day training during fight camps",
      "Olympic-level wrestling + world-class striking",
      "Pioneered yoga and gymnastics in MMA",
      "Scientific periodization approach",
    ],
    funFact: "GSP was one of the first MMA fighters to openly use yoga, an act his peers mocked — until they saw the results.",
  },
  {
    programName: "Conor McGregor: The Notorious Movement",
    fighter: "Conor McGregor",
    style: "MMA (Precision Striking / Movement)",
    era: "2010s",
    nationality: "Irish",
    difficulty: "Advanced" as const,
    difficultyColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tagline: "There's no talent here, this is hard work",
    highlights: [
      "Ido Portal movement methodology",
      "Southpaw precision KO power",
      "Extensive yoga and mobility work",
      "Hill running for conditioning",
    ],
    funFact: "McGregor's collaboration with movement coach Ido Portal revolutionized how MMA fighters think about body movement and mobility.",
  },
  {
    programName: "Rickson Gracie: BJJ Mastery",
    fighter: "Rickson Gracie",
    style: "Brazilian Jiu-Jitsu",
    era: "1980s–2000s",
    nationality: "Brazilian",
    difficulty: "Intermediate" as const,
    difficultyColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tagline: "Jiu-jitsu is the gentle art",
    highlights: [
      "Alleged 400+ fights, 0 losses",
      "Daily breathing exercises (pranayama)",
      "Ocean swimming for conditioning",
      "The 'invisible jiu-jitsu' concept",
    ],
    funFact: "Rickson reportedly won over 400 fights in his career across jiu-jitsu, vale tudo, and MMA — with zero losses.",
  },
  {
    programName: "Jackie Chan: Stuntman Conditioning",
    fighter: "Jackie Chan",
    style: "Hapkido / Wushu / Acrobatics",
    era: "1970s–2000s",
    nationality: "Chinese-Hong Kong",
    difficulty: "Intermediate" as const,
    difficultyColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tagline: "I never wanted to be the next Bruce Lee — I wanted to be the first Jackie Chan",
    highlights: [
      "Peking Opera training from age 6",
      "19-hour training days at drama academy",
      "Full splits in all directions",
      "Performed nearly all his own stunts",
    ],
    funFact: "Jackie Chan has broken his nose 3 times, cheekbones, shoulders, hands, feet, both legs, and his skull during film stunt work.",
  },
  {
    programName: "Ip Man: Wing Chun Traditional Training",
    fighter: "Ip Man",
    style: "Wing Chun Kung Fu",
    era: "1920s–70s",
    nationality: "Chinese",
    difficulty: "Intermediate" as const,
    difficultyColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tagline: "Wing Chun is not just fighting — it is a way of living",
    highlights: [
      "Teacher of Bruce Lee",
      "Systematic 3-form curriculum",
      "Chi Sao sensitivity training",
      "116-technique wooden dummy form",
    ],
    funFact: "Ip Man taught Bruce Lee Wing Chun, and Bruce Lee used it as the foundation for his own art, Jeet Kune Do.",
  },
];

const DIFFICULTY_ORDER = { Elite: 0, Advanced: 1, Intermediate: 2, Beginner: 3 };

export default function LegendaryProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workout/programs")
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Map program name → program object
  const programsByName = Object.fromEntries(programs.map((p) => [p.name, p]));

  async function setActive(id: string, name: string) {
    setActivating(id);
    const res = await fetch(`/api/workout/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      setPrograms((prev) => prev.map((p) => ({ ...p, active: p.id === id })));
      toast.success(`${name} set as active program.`);
    }
    setActivating(null);
  }

  const sorted = [...LEGENDARY_FIGHTERS].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  );

  const seededCount = sorted.filter((f) => programsByName[f.programName]).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Swords className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Legendary Fighter Programs</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Train like the greatest martial artists and fighters in history. These programs are based on the documented
          training regimens of legendary athletes.
        </p>
        {loading ? null : seededCount === 0 ? (
          <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Programs not yet seeded</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Run <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">npm run seed:legendary</code> to
              add these programs to your account.
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-2">
            {seededCount} of {LEGENDARY_FIGHTERS.length} programs available · Select one to set as your active program
          </p>
        )}
      </div>

      {/* Fighter Cards */}
      <div className="space-y-4">
        {sorted.map((fighter) => {
          const program = programsByName[fighter.programName];
          return (
            <Card
              key={fighter.fighter}
              className={program?.active ? "ring-2 ring-gray-900 dark:ring-gray-100" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <CardTitle className="text-base">{fighter.fighter}</CardTitle>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fighter.difficultyColor}`}
                      >
                        {fighter.difficulty}
                      </span>
                      {program?.active && (
                        <Badge className="text-xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {fighter.style} · {fighter.nationality} · {fighter.era}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1.5">
                      &ldquo;{fighter.tagline}&rdquo;
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {program ? (
                      <>
                        {!program.active && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activating === program.id}
                            onClick={() => setActive(program.id, fighter.fighter)}
                          >
                            {activating === program.id ? "Setting..." : "Set Active"}
                          </Button>
                        )}
                        <Link href={`/workout/programs/${program.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not seeded</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Program stats */}
                {program && (
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{program.daysPerWeek} days/week</span>
                    <span>{program.durationWeeks} weeks</span>
                    <span>{program.days.length} training days</span>
                    <span>
                      {program.days.reduce((acc, d) => acc + d.exercises.length, 0)} total exercises
                    </span>
                  </div>
                )}

                {/* Training highlights */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Training Highlights</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fighter.highlights.map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs font-normal">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Fun fact */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Fun Fact: </span>
                    {fighter.funFact}
                  </p>
                </div>

                {/* Loading skeleton */}
                {loading && (
                  <Skeleton className="h-4 w-48" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          Programs are inspired by documented training regimens. Always consult a professional before starting an advanced program.
        </p>
      </div>
    </div>
  );
}
