"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MirrorLogo } from "@/components/ui/mirror-logo";
import { ThreeJSGlobeWithDots } from "@/components/threejs-globe-with-dots";

// ── helpers ────────────────────────────────────────────────────────────────

const TYPING_PHRASES = [
  "I want to build a fintech app for gen-z...",
  "Launch a D2C skincare brand in Asia...",
  "SaaS tool for remote HR teams...",
  "EV charging network for tier-2 cities...",
];

const SESSIONS = [
  { label: "I want to build a finte...", date: "3/23/2026" },
  { label: "Launch D2C skincare in...", date: "3/22/2026" },
  { label: "SaaS for remote HR...", date: "3/21/2026" },
];

const FEEDBACK = [
  { name: "Priya S.", sentiment: "HIGH", text: "Very relevant to my workflow" },
  { name: "James K.", sentiment: "MED", text: "Interesting but pricey" },
  { name: "Yuki T.", sentiment: "HIGH", text: "Would share with my team" },
  { name: "Amara O.", sentiment: "LOW", text: "Not sure about the UX yet" },
];


// ── sub-components ─────────────────────────────────────────────────────────

function TypingInput() {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = TYPING_PHRASES[phraseIdx];
    const speed = deleting ? 30 : 55;
    const t = setTimeout(() => {
      if (!deleting) {
        if (charIdx < phrase.length) {
          setText(phrase.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        } else {
          setTimeout(() => setDeleting(true), 1400);
        }
      } else {
        if (charIdx > 0) {
          setText(phrase.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        } else {
          setDeleting(false);
          setPhraseIdx((i) => (i + 1) % TYPING_PHRASES.length);
        }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [charIdx, deleting, phraseIdx]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-black/60">
      <span className="text-[10px] text-white/30 font-mono flex-1 truncate">
        {text}
        <span className="inline-block w-[1px] h-[10px] bg-white/50 ml-[1px] animate-pulse align-middle" />
      </span>
      <button className="px-3 py-1 text-[10px] font-mono bg-white/10 text-white/60 border border-white/10 hover:bg-white/20 transition">
        Analyse
      </button>
    </div>
  );
}

function GlobeCenter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize(Math.floor(Math.min(width, height)));
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <ThreeJSGlobeWithDots
        size={size}
        color="#333333"
        speed={0.003}
        dots={[]}
      />
      {/* Bottom status bar */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] font-mono text-white/30 pointer-events-none">
        <span>199 Auth0 users loaded</span>
        <span>No analysis running</span>
      </div>
    </div>
  );
}

function ImpactBar({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="h-[6px] w-[8px] transition-colors duration-500"
          style={{ background: i < value ? "#3b82f6" : "#1a2a3a" }}
        />
      ))}
    </div>
  );
}

function MetricsPanel() {
  const [score, setScore] = useState(3);
  const [feedbackIdx, setFeedbackIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setScore((s) => (s >= 8 ? 3 : s + 1));
    }, 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFeedbackIdx((i) => (i + 1) % FEEDBACK.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const sentimentColor: Record<string, string> = {
    HIGH: "#22c55e",
    MED: "#f59e0b",
    LOW: "#ef4444",
  };

  return (
    <div className="flex flex-col gap-3 text-[10px] font-mono">
      {/* Mission Status */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/60 uppercase tracking-widest">Mission Status</span>
        </div>
        <div className="pl-4 space-y-1">
          <div className="text-white/40">Impact Score</div>
          <ImpactBar value={score} />
          <div className="text-white/30 mt-1">
            {score}
            <span className="text-white/20 text-[9px]"> / 10</span>
          </div>
          <div className="text-white/50 uppercase tracking-widest mt-1">
            Status:{" "}
            <span className={score >= 7 ? "text-green-400" : score >= 4 ? "text-yellow-400" : "text-red-400"}>
              {score >= 7 ? "STRONG" : score >= 4 ? "MODERATE" : "CRITICAL"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8" />

      {/* Agent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-white/60 uppercase tracking-widest">Agent Activity</span>
        </div>
        <div className="pl-4 space-y-1">
          {["HIGH ENGAGEMENT", "MEDIUM ENGAGEMENT", "LOW ENGAGEMENT"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: ["#22c55e", "#f59e0b", "#6b7280"][i] }}
              />
              <div className="flex gap-[2px] flex-1">
                {Array.from({ length: 8 }).map((_, j) => (
                  <motion.div
                    key={j}
                    className="h-[4px] flex-1 rounded-sm"
                    style={{ background: ["#22c55e33", "#f59e0b33", "#6b728033"][i] }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, delay: j * 0.1 + i * 0.4, repeat: Infinity }}
                  />
                ))}
              </div>
              <span className="text-white/20 text-[9px] shrink-0">{label.split(" ")[0][0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/8" />

      {/* Feedback */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-white/60 uppercase tracking-widest">Feedback Stream</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={feedbackIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="pl-4 space-y-1"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[8px] uppercase px-1 py-[1px] rounded"
                style={{ background: sentimentColor[FEEDBACK[feedbackIdx].sentiment] + "22", color: sentimentColor[FEEDBACK[feedbackIdx].sentiment] }}
              >
                {FEEDBACK[feedbackIdx].sentiment}
              </span>
              <span className="text-white/50">{FEEDBACK[feedbackIdx].name}</span>
            </div>
            <p className="text-white/30 leading-relaxed">{FEEDBACK[feedbackIdx].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function MockAppUI() {
  const [activeSession, setActiveSession] = useState(0);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        background: "#080c14",
        fontFamily: "monospace",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 py-2 border-b border-white/10 bg-black/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5">
            <MirrorLogo />
          </div>
          <span className="text-white text-xs font-mono">Mirror</span>
        </div>
        <div className="ml-4 text-white/30 text-[10px] font-mono">← Projects View</div>
        <div className="ml-auto flex gap-1">
          {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-44 shrink-0 border-r border-white/10 flex flex-col bg-black/30">
          <div className="px-3 pt-3 pb-2 space-y-2">
            <div className="text-[9px] text-white/30 uppercase tracking-widest">Current Society</div>
            <div className="flex items-center justify-between px-2 py-1 border border-white/10 bg-white/5 text-[10px] text-white/70">
              <span>Startup Investors</span>
              <span className="text-white/30">▾</span>
            </div>
            <button className="w-full text-center py-1 border border-white/20 bg-white/5 text-[10px] text-white hover:bg-white/10 transition">
              + Create New Session
            </button>
          </div>
          <div className="px-3 py-2 border-t border-white/10">
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">
              Analysis Sessions
            </div>
            <div className="space-y-1">
              {SESSIONS.map((s, i) => (
                <motion.div
                  key={i}
                  onClick={() => setActiveSession(i)}
                  className="px-2 py-1.5 cursor-pointer text-[9px] font-mono transition-colors rounded-none"
                  style={{
                    background: activeSession === i ? "rgba(59,130,246,0.12)" : "transparent",
                    borderLeft: activeSession === i ? "2px solid #3b82f6" : "2px solid transparent",
                    color: activeSession === i ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                  }}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <div className="truncate">{s.label}</div>
                  <div className="text-white/20 mt-0.5">{s.date}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mt-auto px-3 py-2 border-t border-white/10 text-[9px] text-white/20 space-y-0.5">
            <div>199 Auth0 users loaded</div>
            <div>No analysis running</div>
          </div>
        </div>

        {/* Globe / Center */}
        <div className="flex-1 relative">
          <GlobeCenter />
        </div>

        {/* Right panel */}
        <div className="w-44 shrink-0 border-l border-white/10 bg-black/40 px-3 py-3 overflow-y-auto">
          <MetricsPanel />
        </div>
      </div>

      {/* Bottom input */}
      <TypingInput />
    </div>
  );
}
