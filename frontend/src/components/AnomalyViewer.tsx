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
      <div className="p-3 border border-zinc-800 rounded-md bg-zinc-950 text-zinc-400 text-xs flex items-center gap-2">
        <Info className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>No statistical outliers detected in this subset. Values reside within normal distributions.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{anomalies.length} Outlier(s) Flagged</span>
        </h4>
        <span className="text-[11px] text-zinc-500 font-mono">Algorithms: IQR, Z-Score, Isolation Forest</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {anomalies.map((a, i) => (
          <div
            key={i}
            className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800 text-xs space-y-1.5 hover:border-zinc-700 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-medium text-zinc-200">
                Row #{a.record_index} : <span className="text-amber-400 font-mono">{a.column_name}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono text-[10px] font-medium border border-zinc-700">
                Score {a.score}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
              <span className="text-zinc-500">Observed:</span>
              <span className="font-semibold text-zinc-100 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                {String(a.value)}
              </span>
              <span className="text-zinc-600">:</span>
              <span className="text-zinc-400">{a.method}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed pt-0.5">{a.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
