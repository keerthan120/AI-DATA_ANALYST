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
      <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/60 text-slate-400 text-xs flex items-center gap-2">
        <Info className="w-4 h-4 text-emerald-400" />
        <span>No statistical outliers detected in this subset. All values reside within normal standard deviations.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{anomalies.length} Statistical Outlier(s) Flagged</span>
        </h4>
        <span className="text-[11px] text-slate-500 font-mono">Methods: IQR, Z-Score & Isolation Forest</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {anomalies.map((a, i) => (
          <div
            key={i}
            className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5 hover:border-amber-500/40 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-slate-200">
                Row #{a.record_index} • <span className="text-amber-400">{a.column_name}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                Score: {a.score}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
              <span className="text-slate-500">Value:</span>
              <span className="font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {String(a.value)}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{a.method}</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">{a.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

