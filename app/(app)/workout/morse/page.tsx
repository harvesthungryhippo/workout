"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = "0123456789".split("");
const PUNCTS = [".", ",", "?", "'", "!", "/", "(", ")", "&", ":", ";", "=", "+", "-", "@"].filter((c) => MORSE[c]);
const PRACTICE_POOL = [...LETTERS, ...DIGITS];
const CHART_CHARS = [...LETTERS, ...DIGITS];

function MorseSymbol({ char, color = "indigo" }: { char: string; color?: "indigo" | "green" | "gray" }) {
  const dot = color === "green" ? "bg-green-500" : color === "gray" ? "bg-gray-400 dark:bg-gray-600" : "bg-indigo-500 dark:bg-indigo-400";
  const dash = dot;
  return (
    <span className="inline-flex items-center gap-0.5">
      {char.split("").map((c, i) =>
        c === "." ? (
          <span key={i} className={cn("inline-block w-1.5 h-1.5 rounded-full", dot)} />
        ) : c === "-" ? (
          <span key={i} className={cn("inline-block w-4 h-1.5 rounded-full", dash)} />
        ) : null
      )}
    </span>
  );
}

function MorseSymbolLarge({ char }: { char: string }) {
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
    if (token === "/") { lastEnd += wordGap - letterGap; continue; }
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

// ─── TAP TAB ────────────────────────────────────────────────────────────────

function TapTab() {
  const sequenceRef = useRef("");
  const [sequenceDisplay, setSequenceDisplay] = useState("");
  const [committed, setCommitted] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pressing, setPressing] = useState(false);

  const pressStartRef = useRef(0);
  const letterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const DOT_THRESHOLD = 200; // ms
  const LETTER_GAP = 700;   // ms of silence to commit a letter

  useEffect(() => {
    return () => {
      if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
      if (committedTimerRef.current) clearTimeout(committedTimerRef.current);
      stopTone();
      try { audioCtxRef.current?.close(); } catch (_) {}
    };
  }, []);

  function ensureCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function startTone() {
    const ctx = ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 650;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.008);
    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;
  }

  function stopTone() {
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    const osc = oscRef.current;
    if (ctx && gain && osc) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
        osc.stop(ctx.currentTime + 0.012);
      } catch (_) {}
      oscRef.current = null;
      gainRef.current = null;
    }
  }

  function commitCurrent(seq?: string) {
    const s = seq ?? sequenceRef.current;
    if (!s) return;
    const char = REVERSE_MORSE[s];
    sequenceRef.current = "";
    setSequenceDisplay("");
    if (char) {
      if (committedTimerRef.current) clearTimeout(committedTimerRef.current);
      setCommitted(char);
      setMessage((m) => m + char);
      committedTimerRef.current = setTimeout(() => setCommitted(null), 1200);
    }
  }

  function addSymbol(sym: string) {
    sequenceRef.current += sym;
    const newSeq = sequenceRef.current;
    setSequenceDisplay(newSeq);
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
    letterTimerRef.current = setTimeout(() => commitCurrent(newSeq), LETTER_GAP);
  }

  function handlePressStart(e: React.PointerEvent) {
    e.preventDefault();
    pressStartRef.current = Date.now();
    setPressing(true);
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
    startTone();
  }

  function handlePressEnd(e: React.PointerEvent) {
    e.preventDefault();
    if (!pressing) return;
    const duration = Date.now() - pressStartRef.current;
    setPressing(false);
    stopTone();
    addSymbol(duration < DOT_THRESHOLD ? "." : "-");
  }

  function addWordSpace() {
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
    commitCurrent();
    setMessage((m) => (m.endsWith(" ") || m === "" ? m : m + " "));
  }

  function handleClear() {
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
    if (committedTimerRef.current) clearTimeout(committedTimerRef.current);
    sequenceRef.current = "";
    setSequenceDisplay("");
    setMessage("");
    setCommitted(null);
  }

  function handleBackspace() {
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
    if (sequenceDisplay) {
      const newSeq = sequenceDisplay.slice(0, -1);
      sequenceRef.current = newSeq;
      setSequenceDisplay(newSeq);
      if (newSeq) {
        letterTimerRef.current = setTimeout(() => commitCurrent(newSeq), LETTER_GAP);
      }
    } else {
      setMessage((m) => m.trimEnd().slice(0, -1));
    }
  }

  // Chart state: which chars are reachable from the current sequence prefix
  const possibleSet = new Set(
    sequenceDisplay
      ? CHART_CHARS.filter((c) => MORSE[c].startsWith(sequenceDisplay))
      : []
  );
  const exactMatch = sequenceDisplay ? REVERSE_MORSE[sequenceDisplay] : null;
  const hasSequence = sequenceDisplay.length > 0;

  return (
    <div className="space-y-4">
      {/* Tap key + sequence display */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-5">
          {/* Sequence being built */}
          <div className="flex items-center justify-center gap-2 min-h-8">
            {sequenceDisplay ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {sequenceDisplay.split("").map((s, i) =>
                    s === "." ? (
                      <span key={i} className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.6)]" />
                    ) : (
                      <span key={i} className="w-9 h-3.5 rounded-full bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.6)]" />
                    )
                  )}
                </div>
                <span className="text-sm font-mono text-indigo-500 dark:text-indigo-400">{sequenceDisplay}</span>
                {exactMatch && (
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">→ {exactMatch}</span>
                )}
              </div>
            ) : committed ? (
              <span className="text-3xl font-bold text-green-500 animate-bounce">{committed}</span>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">tap to input · hold for dash</span>
            )}
          </div>

          {/* TAP BUTTON */}
          <div className="flex justify-center">
            <button
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={(e) => { if (pressing) handlePressEnd(e); }}
              className={cn(
                "w-36 h-36 rounded-full font-bold text-white transition-all select-none",
                "flex flex-col items-center justify-center gap-1",
                pressing
                  ? "bg-indigo-700 scale-90 shadow-inner shadow-indigo-900"
                  : "bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-300 dark:shadow-indigo-900"
              )}
              style={{ touchAction: "none" }}
            >
              <span className="text-xl tracking-widest">TAP</span>
              <span className="text-[10px] opacity-60">hold = dash</span>
            </button>
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" size="sm" onClick={addWordSpace}>Space</Button>
            <Button variant="outline" size="sm" onClick={() => { if (letterTimerRef.current) clearTimeout(letterTimerRef.current); commitCurrent(); }}>
              Commit letter
            </Button>
            <Button variant="outline" size="sm" onClick={handleBackspace}>⌫</Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleClear}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Message output */}
      {(message || sequenceDisplay) && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xl font-semibold tracking-widest text-gray-900 dark:text-white font-mono text-center min-h-8">
              {message}
              {sequenceDisplay && <span className="text-indigo-400 animate-pulse">_</span>}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Live chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {hasSequence
              ? `Matching "${sequenceDisplay}" — ${possibleSet.size} possible`
              : "Chart — tap to see it narrow down"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {CHART_CHARS.map((c) => {
              const isCommitted = committed === c;
              const isExact = exactMatch === c;
              const isPossible = possibleSet.has(c);
              return (
                <div
                  key={c}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-2 transition-all duration-150",
                    isCommitted
                      ? "bg-green-100 dark:bg-green-900/60 ring-2 ring-green-400 scale-105 shadow-sm"
                      : isExact
                      ? "bg-indigo-100 dark:bg-indigo-900/60 ring-2 ring-indigo-400"
                      : isPossible
                      ? "bg-indigo-50 dark:bg-indigo-950/80 ring-1 ring-indigo-200 dark:ring-indigo-700"
                      : hasSequence
                      ? "opacity-25 bg-gray-50 dark:bg-gray-800"
                      : "bg-gray-50 dark:bg-gray-800"
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold w-5 shrink-0",
                    isCommitted ? "text-green-700 dark:text-green-300"
                      : isExact ? "text-indigo-700 dark:text-indigo-300"
                      : isPossible ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-900 dark:text-white"
                  )}>
                    {c}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <MorseSymbol
                      char={MORSE[c]}
                      color={isCommitted ? "green" : isPossible ? "indigo" : "gray"}
                    />
                    <span className={cn(
                      "text-[9px] font-mono leading-none",
                      isPossible ? "text-indigo-500 dark:text-indigo-400" : "text-gray-400 dark:text-gray-600"
                    )}>
                      {MORSE[c]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

const TABS = ["Learn", "Tap", "Encode", "Decode", "Practice"] as const;
type Tab = typeof TABS[number];

export default function MorsePage() {
  const [tab, setTab] = useState<Tab>("Tap");

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
    if (playing) { audioCtxRef.current?.close(); setPlaying(false); return; }
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
    setCurrent(PRACTICE_POOL[Math.floor(Math.random() * PRACTICE_POOL.length)]);
    setAnswer("");
    setResult(null);
    setRevealed(false);
  }

  function checkAnswer() {
    const userAnswer = mode === "char-to-morse" ? answer.trim() : answer.trim().toUpperCase();
    const isCorrect = mode === "char-to-morse" ? userAnswer === MORSE[current] : userAnswer === current;
    setResult(isCorrect ? "correct" : "wrong");
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
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
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
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
                      <MorseSymbolLarge char={MORSE[c]} />
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
                      <MorseSymbolLarge char={MORSE[c]} />
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
                      <MorseSymbolLarge char={MORSE[c]} />
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

      {/* TAP */}
      {tab === "Tap" && <TapTab />}

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
                          <MorseSymbolLarge char={tok} />
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
                  <input type="range" min={5} max={40} value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-24 accent-indigo-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-14">{wpm} WPM</span>
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={!encodedMorse}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                  <Button size="sm" onClick={handlePlay} disabled={!encodedMorse} className={playing ? "bg-red-500 hover:bg-red-600" : ""}>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => { setMode("char-to-morse"); nextPractice(); }}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "char-to-morse" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Char → Morse
              </button>
              <button
                onClick={() => { setMode("morse-to-char"); nextPractice(); }}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === "morse-to-char" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Morse → Char
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Score: <span className="font-semibold text-gray-900 dark:text-white">{score.correct}/{score.total}</span>
              {score.total > 0 && <span className="ml-1 text-xs">({Math.round(score.correct / score.total * 100)}%)</span>}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 pb-6 space-y-5">
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
                      <MorseSymbolLarge char={MORSE[current]} />
                    </div>
                    <p className="font-mono text-xl text-gray-600 dark:text-gray-300">{MORSE[current]}</p>
                  </>
                )}
              </div>

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

              {result && (
                <div className={cn("rounded-lg p-3 text-center text-sm font-medium",
                  result === "correct" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300")}>
                  {result === "correct" ? "Correct!" : (
                    mode === "char-to-morse" ? `Wrong. Answer: ${MORSE[current]}` : `Wrong. Answer: ${current}`
                  )}
                </div>
              )}

              {revealed && !result && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-center text-sm text-yellow-700 dark:text-yellow-300">
                  {mode === "char-to-morse" ? `Answer: ${MORSE[current]}` : `Answer: ${current}`}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {!result && !revealed && <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>Reveal</Button>}
                {!result && answer && <Button size="sm" onClick={checkAnswer}>Check</Button>}
                {(result || revealed) && (
                  <Button size="sm" onClick={nextPractice}>Next <RotateCcw className="h-3.5 w-3.5 ml-1" /></Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" className="text-xs text-gray-400"
            onClick={() => { setScore({ correct: 0, total: 0 }); nextPractice(); }}>
            Reset score
          </Button>
        </div>
      )}
    </div>
  );
}
