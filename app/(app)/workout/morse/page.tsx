"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Copy, Check, RotateCcw, Volume2, Radio } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MORSE: Record<string, string> = {
  A: ".-",    B: "-...",  C: "-.-.",  D: "-..",   E: ".",     F: "..-.",
  G: "--.",   H: "....",  I: "..",    J: ".---",  K: "-.-",   L: ".-..",
  M: "--",    N: "-.",    O: "---",   P: ".--.",  Q: "--.-",  R: ".-.",
  S: "...",   T: "-",     U: "..-",   V: "...-",  W: ".--",   X: "-..-",
  Y: "-.--",  Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
  "!": "-.-.--", "/": "-..-.", "(": "-.--.",  ")": "-.--.-",
  "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
  "+": ".-.-.", "-": "-....-", "_": "..--.-", "\"": ".-..-.",
  "@": ".--.-.",
};

const REVERSE_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k])
);

function MorseSymbol({ char }: { char: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {char.split("").map((c, i) =>
        c === "." ? (
          <span key={i} className="inline-block w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
        ) : c === "-" ? (
          <span key={i} className="inline-block w-5 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
        ) : null
      )}
    </span>
  );
}

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((c) => (c === " " ? "/" : (MORSE[c] ?? "")))
    .filter((c) => c !== "")
    .join(" ");
}

function morseToText(morse: string): string {
  return morse
    .trim()
    .split(/\s+\/\s+|\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((code) => REVERSE_MORSE[code] ?? "?")
        .join("")
    )
    .join(" ");
}

function playMorse(morse: string, wpm: number, onDone: () => void) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const dotDuration = 1.2 / wpm;
  const dashDuration = 3 * dotDuration;
  const symbolGap = dotDuration;
  const letterGap = 3 * dotDuration;
  const wordGap = 7 * dotDuration;

  let t = ctx.currentTime + 0.05;

  function beep(start: number, duration: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.4, start + 0.005);
    gain.gain.setValueAtTime(0.4, start + duration - 0.005);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    osc.start(start);
    osc.stop(start + duration);
  }

  const tokens = morse.split(" ");
  let lastEnd = t;

  for (const token of tokens) {
    if (token === "/") {
      lastEnd += wordGap - letterGap;
      continue;
    }
    const symbols = token.split("");
    for (let i = 0; i < symbols.length; i++) {
      const dur = symbols[i] === "." ? dotDuration : dashDuration;
      beep(lastEnd, dur);
      lastEnd += dur + (i < symbols.length - 1 ? symbolGap : 0);
    }
    lastEnd += letterGap;
  }

  setTimeout(onDone, (lastEnd - ctx.currentTime) * 1000 + 100);
  return ctx;
}

const TABS = ["Learn", "Encode", "Decode", "Practice"] as const;
type Tab = typeof TABS[number];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = "0123456789".split("");
const PUNCTS = [".", ",", "?", "'", "!", "/", "(", ")", "&", ":", ";", "=", "+", "-", "@"].filter((c) => MORSE[c]);

const PRACTICE_POOL = [...LETTERS, ...DIGITS];

export default function MorsePage() {
  const [tab, setTab] = useState<Tab>("Learn");

  // Encode
  const [encodeInput, setEncodeInput] = useState("");
  const [wpm, setWpm] = useState(15);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Decode
  const [decodeInput, setDecodeInput] = useState("");

  // Practice
  const [mode, setMode] = useState<"char-to-morse" | "morse-to-char">("char-to-morse");
  const [current, setCurrent] = useState(() => PRACTICE_POOL[Math.floor(Math.random() * PRACTICE_POOL.length)]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [revealed, setRevealed] = useState(false);

  const encodedMorse = textToMorse(encodeInput);
  const decodedText = decodeInput.trim() ? morseToText(decodeInput) : "";

  function handlePlay() {
    if (playing) {
      audioCtxRef.current?.close();
      setPlaying(false);
      return;
    }
    if (!encodedMorse) return;
    setPlaying(true);
    audioCtxRef.current = playMorse(encodedMorse, wpm, () => setPlaying(false));
  }

  function handleCopy() {
    navigator.clipboard.writeText(encodedMorse);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Morse code copied");
  }

  function nextPractice() {
    const next = PRACTICE_POOL[Math.floor(Math.random() * PRACTICE_POOL.length)];
    setCurrent(next);
    setAnswer("");
    setResult(null);
    setRevealed(false);
  }

  function checkAnswer() {
    const correct = MORSE[current];
    const userAnswer = mode === "char-to-morse"
      ? answer.trim()
      : answer.trim().toUpperCase();
    const isCorrect = mode === "char-to-morse"
      ? userAnswer === correct
      : userAnswer === current;
    setResult(isCorrect ? "correct" : "wrong");
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
  }

  function appendMorse(sym: string) {
    setAnswer((a) => (a ? a + " " + sym : sym));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Radio className="h-6 w-6 text-indigo-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Morse Code</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Learn, encode, decode, and practice</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* LEARN */}
      {tab === "Learn" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Letters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {LETTERS.map((c) => (
                  <div key={c} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white w-6">{c}</span>
                    <div className="flex flex-col gap-1">
                      <MorseSymbol char={MORSE[c]} />
                      <span className="text-xs text-gray-400 font-mono">{MORSE[c]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {DIGITS.map((c) => (
                  <div key={c} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white w-6">{c}</span>
                    <div className="flex flex-col gap-1">
                      <MorseSymbol char={MORSE[c]} />
                      <span className="text-xs text-gray-400 font-mono">{MORSE[c]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Punctuation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {PUNCTS.map((c) => (
                  <div key={c} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white w-6">{c}</span>
                    <div className="flex flex-col gap-1">
                      <MorseSymbol char={MORSE[c]} />
                      <span className="text-xs text-gray-400 font-mono">{MORSE[c]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <span className="block"><span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">.</span> = dot (short signal)</span>
                <span className="block"><span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">-</span> = dash (long signal, 3× a dot)</span>
                <span className="block">Gap between letters = 3 dots · Gap between words = 7 dots</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ENCODE */}
      {tab === "Encode" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Textarea
                placeholder="Type your message here..."
                value={encodeInput}
                onChange={(e) => setEncodeInput(e.target.value)}
                rows={3}
                className="resize-none"
              />

              {encodedMorse && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5 min-h-8">
                    {encodedMorse.split(" ").map((tok, i) =>
                      tok === "/" ? (
                        <span key={i} className="text-gray-400 self-center text-sm px-1">/</span>
                      ) : (
                        <span key={i} className="flex items-center gap-0.5 px-2 py-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                          <MorseSymbol char={tok} />
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{encodedMorse}</p>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Speed:</span>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    value={wpm}
                    onChange={(e) => setWpm(Number(e.target.value))}
                    className="w-24 accent-indigo-500"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-14">{wpm} WPM</span>
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!encodedMorse}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePlay}
                    disabled={!encodedMorse}
                    className={playing ? "bg-red-500 hover:bg-red-600" : ""}
                  >
                    {playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span className="ml-1">{playing ? "Stop" : "Play"}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DECODE */}
      {tab === "Decode" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter Morse code using <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">.</span> and <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">-</span>.
                Separate letters with spaces, words with <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded"> / </span>.
              </p>

              <Textarea
                placeholder={"... --- ...  /  -- --- .-. ... ."}
                value={decodeInput}
                onChange={(e) => setDecodeInput(e.target.value)}
                rows={4}
                className="resize-none font-mono text-sm"
              />

              {/* Morse keyboard */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="font-mono text-base px-4" onClick={() => setDecodeInput((v) => v + ".")}>·</Button>
                <Button variant="outline" size="sm" className="font-mono text-base px-4" onClick={() => setDecodeInput((v) => v + "-")}>−</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setDecodeInput((v) => v + " ")}>Letter gap</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setDecodeInput((v) => v.trimEnd() + " / ")}>Word gap</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setDecodeInput((v) => v.slice(0, -1))}>⌫</Button>
                <Button variant="outline" size="sm" className="text-xs text-red-500" onClick={() => setDecodeInput("")}>Clear</Button>
              </div>

              {decodedText && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide">{decodedText}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PRACTICE */}
      {tab === "Practice" && (
        <div className="space-y-4">
          {/* Mode + Score */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => { setMode("char-to-morse"); nextPractice(); }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "char-to-morse"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Char → Morse
              </button>
              <button
                onClick={() => { setMode("morse-to-char"); nextPractice(); }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "morse-to-char"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Morse → Char
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Score: <span className="font-semibold text-gray-900 dark:text-white">{score.correct}/{score.total}</span>
              {score.total > 0 && (
                <span className="ml-1 text-xs">({Math.round(score.correct / score.total * 100)}%)</span>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 pb-6 space-y-5">
              {/* Prompt */}
              <div className="text-center space-y-3">
                {mode === "char-to-morse" ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-gray-400">What is the Morse code for</p>
                    <div className="text-6xl font-bold text-gray-900 dark:text-white">{current}</div>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-gray-400">What character is this?</p>
                    <div className="flex justify-center items-center gap-2 py-2">
                      <MorseSymbol char={MORSE[current]} />
                    </div>
                    <p className="font-mono text-xl text-gray-600 dark:text-gray-300">{MORSE[current]}</p>
                  </>
                )}
              </div>

              {/* Answer input */}
              {mode === "char-to-morse" ? (
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 min-h-10 font-mono text-center text-gray-700 dark:text-gray-200">
                    {answer || <span className="text-gray-400">tap the buttons below</span>}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" className="text-xl px-6" onClick={() => setAnswer((a) => a + ".")} disabled={!!result}>·</Button>
                    <Button variant="outline" className="text-xl px-6" onClick={() => setAnswer((a) => a + "-")} disabled={!!result}>−</Button>
                    <Button variant="outline" size="sm" onClick={() => setAnswer((a) => a.slice(0, -1))} disabled={!!result}>⌫</Button>
                  </div>
                </div>
              ) : (
                <Input
                  className="text-center text-xl uppercase"
                  placeholder="Type the character"
                  maxLength={1}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                  disabled={!!result}
                  onKeyDown={(e) => { if (e.key === "Enter" && answer && !result) checkAnswer(); }}
                />
              )}

              {/* Feedback */}
              {result && (
                <div className={cn(
                  "rounded-lg p-3 text-center text-sm font-medium",
                  result === "correct"
                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                )}>
                  {result === "correct" ? "Correct!" : (
                    mode === "char-to-morse"
                      ? `Wrong. Answer: ${MORSE[current]}`
                      : `Wrong. Answer: ${current}`
                  )}
                </div>
              )}

              {revealed && !result && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-center text-sm text-yellow-700 dark:text-yellow-300">
                  {mode === "char-to-morse" ? `Answer: ${MORSE[current]}` : `Answer: ${current}`}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                {!result && !revealed && (
                  <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
                    Reveal
                  </Button>
                )}
                {!result && answer && (
                  <Button size="sm" onClick={checkAnswer}>Check</Button>
                )}
                {(result || revealed) && (
                  <Button size="sm" onClick={nextPractice}>
                    Next <RotateCcw className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="sm"
            className="text-xs text-gray-400"
            onClick={() => { setScore({ correct: 0, total: 0 }); nextPractice(); }}
          >
            Reset score
          </Button>
        </div>
      )}
    </div>
  );
}
