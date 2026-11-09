"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Zap } from "lucide-react";

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
    <div className="border border-[#383838] rounded-lg bg-[#2f2f2f]/50 overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-[#b4b4b4] hover:bg-[#2f2f2f] transition"
      >
        <div className="flex items-center gap-2 font-medium">
          <Zap className="w-3.5 h-3.5 text-[#8e8e8e]" />
          <span>Execution steps ({steps.length})</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#6b6b6b] font-mono">
          {executionTimeMs !== undefined && <span>{executionTimeMs}ms</span>}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 pt-2 border-t border-[#383838] space-y-1.5 text-xs">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[#b4b4b4]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-mono text-[11px] leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
