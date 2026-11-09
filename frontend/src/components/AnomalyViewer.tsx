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
      <div className="p-3 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] text-[#64748b] text-sm flex items-center gap-2">
        <Info className="w-4 h-4 text-[#2cb8b2] shrink-0" />
        <span>No statistical outliers detected. Values are within normal distributions.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          {anomalies.length} outlier{anomalies.length !== 1 ? "s" : ""} flagged
        </h4>
        <span className="text-[11px] text-[#64748b] font-mono">IQR / Z-Score / Isolation Forest</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {anomalies.map((a, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-[#fffdfa] border border-[#fef3c7] text-xs space-y-1.5 hover:border-amber-300 transition shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-medium text-[#1e293b]">
                Row #{a.record_index} : <span className="text-amber-700 font-semibold">{a.column_name}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-medium border border-amber-200">
                Score: {a.score}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#475569]">
              <span className="text-[#64748b]">Value:</span>
              <span className="font-semibold text-[#0f172a] bg-white border border-[#e2e8f0] px-1.5 py-0.5 rounded">{String(a.value)}</span>
              <span className="text-[#94a3b8]">{a.method}</span>
            </div>
            <p className="text-[11px] text-[#475569] leading-relaxed">{a.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
