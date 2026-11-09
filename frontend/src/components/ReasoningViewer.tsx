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
    <div className="border border-[#e2e8f0] rounded-lg bg-[#f8fafc] overflow-hidden mb-3 shadow-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs text-[#475569] hover:bg-[#f1f5f9] transition"
      >
        <div className="flex items-center gap-2 font-medium">
          <Zap className="w-3.5 h-3.5 text-[#2cb8b2]" />
          <span>Execution steps ({steps.length})</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#64748b] font-mono">
          {executionTimeMs !== undefined && <span>{executionTimeMs}ms</span>}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 pt-2 border-t border-[#e2e8f0] space-y-1.5 text-xs bg-white">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[#475569]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2cb8b2] shrink-0 mt-0.5" />
              <span className="font-mono text-[11px] leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
