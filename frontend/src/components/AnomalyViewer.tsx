"use client";

import React from "react";
import { AnomalyRecord } from "@/types";
import { AlertTriangle, Info } from "lucide-react";

interface AnomalyViewerProps {
  anomalies: AnomalyRecord[];
}

export const AnomalyViewer: React.FC<AnomalyViewerProps> = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="p-3 border border-[#383838] rounded-lg bg-[#2f2f2f]/50 text-[#8e8e8e] text-sm flex items-center gap-2">
        <Info className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>No statistical outliers detected. Values are within normal distributions.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5" />
          {anomalies.length} outlier{anomalies.length !== 1 ? "s" : ""} flagged
        </h4>
        <span className="text-[11px] text-[#6b6b6b] font-mono">IQR / Z-Score / Isolation Forest</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {anomalies.map((a, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-[#2f2f2f] border border-[#383838] text-xs space-y-1.5 hover:border-[#555] transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-medium text-[#ececec]">
                Row #{a.record_index} : <span className="text-amber-400">{a.column_name}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#424242] text-amber-300 font-mono text-[10px] font-medium">
                {a.score}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#b4b4b4]">
              <span className="text-[#6b6b6b]">Value:</span>
              <span className="font-semibold text-[#ececec] bg-[#171717] px-1.5 py-0.5 rounded">{String(a.value)}</span>
              <span className="text-[#6b6b6b]">{a.method}</span>
            </div>
            <p className="text-[11px] text-[#8e8e8e] leading-relaxed">{a.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
