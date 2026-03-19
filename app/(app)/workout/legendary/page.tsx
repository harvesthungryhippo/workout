"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, ExternalLink, Plus, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface LegendaryProgram {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  durationWeeks: number;
  days: { id: string; dayNumber: number; name: string; exercises: unknown[] }[];
  addedToMyPrograms: boolean;
  myProgramId: string | null;
  myProgramActive: boolean;
}

const LEGENDARY_META: Record<string, {
  fighter: string;
  style: string;
  era: string;
  nationality: string;
  difficulty: "Elite" | "Advanced" | "Intermediate";
  difficultyColor: string;
  tagline: string;
  highlights: string[];
  funFact: string;
}> = {
  "Bruce Lee: Jeet Kune Do Conditioning": {
    fighter: "Bruce Lee", style: "Jeet Kune Do", era: "1960s–70s", nationality: "Chinese-American",
    difficulty: "Advanced", difficultyColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tagline: "Be water, my friend",
    highlights: ["Famous two-finger push-ups", "Dragon Flag core exercise", "Daily wrist roller for forearms", "6-day split with daily running"],
    funFact: "Bruce Lee could do 50 one-arm push-ups and his punches were measured at 350 lb·ft/s.",
  },
  "Mike Tyson: Iron Mike's Peak Conditioning": {
    fighter: "Mike Tyson", style: "Peekaboo Boxing", era: "1980s–90s", nationality: "American",
    difficulty: "Elite", difficultyColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    tagline: "Everyone has a plan until they get punched in the mouth",
    highlights: ["4am 6-mile run every day", "500+ sit-ups, dips, push-ups daily", "Legendary neck bridge training", "10+ rounds each: bag, mitts, sparring"],
    funFact: "Tyson trained 7 days a week with no days off. He woke at 4am and went to bed by 9pm throughout camp.",
  },
  "Muhammad Ali: Float Like a Butterfly": {
    fighter: "Muhammad Ali", style: "Scientific Boxing", era: "1960s–70s", nationality: "American",
    difficulty: "Advanced", difficultyColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tagline: "Float like a butterfly, sting like a bee",
    highlights: ["6-mile 6am roadwork every day", "Famous Ali Shuffle footwork drill", "Floor-to-ceiling ball for hand speed", "15-round sparring sessions"],
    funFact: "Ali reportedly threw his Olympic gold medal into the Ohio River after being refused service at a diner due to segregation.",
  },
  "Georges St-Pierre (GSP): The Rush": {
    fighter: "Georges St-Pierre", style: "MMA (Wrestling / Muay Thai / BJJ)", era: "2000s–10s", nationality: "Canadian",
    difficulty: "Elite", difficultyColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    tagline: "I don't believe in taking shortcuts",
    highlights: ["Two-a-day training during fight camps", "Olympic-level wrestling + world-class striking", "Pioneered yoga and gymnastics in MMA", "Scientific periodization approach"],
    funFact: "GSP was one of the first MMA fighters to openly use yoga, an act his peers mocked — until they saw the results.",
  },
  "Conor McGregor: The Notorious Movement": {
    fighter: "Conor McGregor", style: "MMA (Precision Striking / Movement)", era: "2010s", nationality: "Irish",
    difficulty: "Advanced", difficultyColor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    tagline: "There's no talent here, this is hard work",
    highlights: ["Ido Portal movement methodology", "Southpaw precision KO power", "Extensive yoga and mobility work", "Hill running for conditioning"],
    funFact: "McGregor's collaboration with movement coach Ido Portal revolutionized how MMA fighters think about body movement and mobility.",
  },
  "Rickson Gracie: BJJ Mastery": {
    fighter: "Rickson Gracie", style: "Brazilian Jiu-Jitsu", era: "1980s–2000s", nationality: "Brazilian",
    difficulty: "Intermediate", difficultyColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tagline: "Jiu-jitsu is the gentle art",
    highlights: ["Alleged 400+ fights, 0 losses", "Daily breathing exercises (pranayama)", "Ocean swimming for conditioning", "The 'invisible jiu-jitsu' concept"],
    funFact: "Rickson reportedly won over 400 fights in his career across jiu-jitsu, vale tudo, and MMA — with zero losses.",
  },
  "Jackie Chan: Stuntman Conditioning": {
    fighter: "Jackie Chan", style: "Hapkido / Wushu / Acrobatics", era: "1970s–2000s", nationality: "Chinese-Hong Kong",
    difficulty: "Intermediate", difficultyColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tagline: "I never wanted to be the next Bruce Lee — I wanted to be the first Jackie Chan",
    highlights: ["Peking Opera training from age 6", "19-hour training days at drama academy", "Full splits in all directions", "Performed nearly all his own stunts"],
    funFact: "Jackie Chan has broken his nose 3 times, cheekbones, shoulders, hands, feet, both legs, and his skull during film stunt work.",
  },
  "Ip Man: Wing Chun Traditional Training": {
    fighter: "Ip Man", style: "Wing Chun Kung Fu", era: "1920s–70s", nationality: "Chinese",
    difficulty: "Intermediate", difficultyColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    tagline: "Wing Chun is not just fighting — it is a way of living",
    highlights: ["Teacher of Bruce Lee", "Systematic 3-form curriculum", "Chi Sao sensitivity training", "116-technique wooden dummy form"],
    funFact: "Ip Man taught Bruce Lee Wing Chun, and Bruce Lee used it as the foundation for his own art, Jeet Kune Do.",
  },
};

const DIFFICULTY_ORDER = { Elite: 0, Advanced: 1, Intermediate: 2 };

export default function LegendaryProgramsPage() {
  const [programs, setPrograms] = useState<LegendaryProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workout/legendary")
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function copyProgram(program: LegendaryProgram) {
    setCopying(program.id);
    const res = await fetch("/api/workout/legendary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: program.id }),
    });
    if (res.ok) {
      const copy = await res.json();
      setPrograms((prev) => prev.map((p) =>
        p.id === program.id ? { ...p, addedToMyPrograms: true, myProgramId: copy.id } : p
      ));
      toast.success(`${program.name} added to your programs!`);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to add program.");
    }
    setCopying(null);
  }

  async function setActive(myProgramId: string, name: string) {
    setActivating(myProgramId);
    const res = await fetch(`/api/workout/programs/${myProgramId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      setPrograms((prev) => prev.map((p) => ({
        ...p,
        myProgramActive: p.myProgramId === myProgramId ? true : p.myProgramActive,
      })));
      toast.success(`${name} set as active program.`);
    }
    setActivating(null);
  }

  const sorted = [...programs].sort((a, b) => {
    const metaA = LEGENDARY_META[a.name];
    const metaB = LEGENDARY_META[b.name];
    if (!metaA || !metaB) return 0;
    return DIFFICULTY_ORDER[metaA.difficulty] - DIFFICULTY_ORDER[metaB.difficulty];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Swords className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Legendary Fighter Programs</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Train like the greatest martial artists and fighters in history. Add any program to your account and start training.
        </p>
        {!loading && (
          <p className="text-xs text-gray-400 mt-2">
            {sorted.length} programs available — add any to your account to start
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Swords className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Legendary programs are being set up.</p>
            <p className="text-xs text-gray-400 mt-1">Check back shortly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((program) => {
            const meta = LEGENDARY_META[program.name];
            if (!meta) return null;
            return (
              <Card key={program.id} className={program.myProgramActive ? "ring-2 ring-gray-900 dark:ring-gray-100" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CardTitle className="text-base">{meta.fighter}</CardTitle>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.difficultyColor}`}>
                          {meta.difficulty}
                        </span>
                        {program.myProgramActive && <Badge className="text-xs">Active</Badge>}
                        {program.addedToMyPrograms && !program.myProgramActive && (
                          <Badge variant="secondary" className="text-xs gap-1"><Check className="h-3 w-3" />In My Programs</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {meta.style} · {meta.nationality} · {meta.era}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1.5">
                        &ldquo;{meta.tagline}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!program.addedToMyPrograms ? (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={copying === program.id}
                          onClick={() => copyProgram(program)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {copying === program.id ? "Adding..." : "Add to My Programs"}
                        </Button>
                      ) : (
                        <>
                          {!program.myProgramActive && program.myProgramId && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={activating === program.myProgramId}
                              onClick={() => setActive(program.myProgramId!, meta.fighter)}
                            >
                              {activating === program.myProgramId ? "Setting..." : "Set Active"}
                            </Button>
                          )}
                          {program.myProgramId && (
                            <Link href={`/workout/programs/${program.myProgramId}`}>
                              <Button size="sm" variant="ghost" className="gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{program.daysPerWeek} days/week</span>
                    <span>{program.durationWeeks} weeks</span>
                    <span>{program.days.length} training days</span>
                    <span>{program.days.reduce((acc, d) => acc + (d.exercises as unknown[]).length, 0)} total exercises</span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Training Highlights</p>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.highlights.map((h) => (
                        <Badge key={h} variant="secondary" className="text-xs font-normal">{h}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Fun Fact: </span>
                      {meta.funFact}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          Programs are inspired by documented training regimens. Always consult a professional before starting an advanced program.
        </p>
      </div>
    </div>
  );
}
