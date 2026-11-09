"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Brain, CheckCircle2 } from "lucide-react";

interface ReasoningViewerProps {
  steps: string[];
  executionTimeMs?: number;
}

export const ReasoningViewer: React.FC<ReasoningViewerProps> = ({
  steps,
  executionTimeMs,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-300 hover:bg-slate-900/60 transition"
      >
        <div className="flex items-center gap-2 font-medium">
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>Agent Reasoning & Execution Steps ({steps.length})</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          {executionTimeMs !== undefined && <span>{executionTimeMs} ms</span>}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 pt-1 border-t border-slate-800/60 space-y-2 text-xs">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span className="font-mono text-[11px] leading-relaxed text-slate-300">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

