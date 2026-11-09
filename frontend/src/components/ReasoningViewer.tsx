"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Activity } from "lucide-react";

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
    <div className="border border-zinc-800 rounded-md bg-zinc-950 overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-zinc-300 hover:bg-zinc-900 transition"
      >
        <div className="flex items-center gap-2 font-mono">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span>Execution Graph Steps ({steps.length})</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
          {executionTimeMs !== undefined && <span>{executionTimeMs} ms</span>}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 pt-2 border-t border-zinc-800 space-y-1.5 text-xs bg-zinc-950">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-mono text-[11px] leading-relaxed text-zinc-400">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
