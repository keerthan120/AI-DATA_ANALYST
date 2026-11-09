"use client";

import React, { useState } from "react";
import { TableSchema } from "@/types";
import { ChevronDown, ChevronRight, Eye, Columns } from "lucide-react";

interface DataPreviewProps {
  tables: TableSchema[];
}

export const DataPreview: React.FC<DataPreviewProps> = ({ tables }) => {
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]?.table_name || "");
  const [showColumns, setShowColumns] = useState(false);

  if (tables.length === 0) return null;

  const current = tables.find((t) => t.table_name === selectedTable) || tables[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" /> Schema & Data Inspection
        </h3>

        {/* Table Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%] py-0.5">
          {tables.map((t) => (
            <button
              key={t.table_name}
              onClick={() => setSelectedTable(t.table_name)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition shrink-0 ${
                selectedTable === t.table_name
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.table_name}
            </button>
          ))}
        </div>
      </div>

      {current && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>
              Rows: <strong className="text-slate-200">{current.row_count.toLocaleString()}</strong> | Columns:{" "}
              <strong className="text-slate-200">{current.column_count}</strong>
            </span>
            <button
              onClick={() => setShowColumns(!showColumns)}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-sans"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{showColumns ? "Hide Column Details" : "Inspect Columns"}</span>
            </button>
          </div>

          {/* Column metadata inspector */}
          {showColumns && (
            <div className="mb-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs max-h-48 overflow-y-auto">
              <div className="grid grid-cols-4 font-semibold text-slate-400 pb-1 border-b border-slate-800 mb-2">
                <span>Column</span>
                <span>Type</span>
                <span>Nulls</span>
                <span>Unique Values</span>
              </div>
              {current.columns.map((c) => (
                <div key={c.name} className="grid grid-cols-4 py-1 border-b border-slate-900/60 font-mono text-[11px]">
                  <span className="text-slate-200 font-medium truncate">{c.name}</span>
                  <span className="text-indigo-400">{c.dtype}</span>
                  <span className={c.null_count > 0 ? "text-amber-400" : "text-slate-500"}>
                    {c.null_count}
                  </span>
                  <span className="text-slate-400">{c.unique_count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Row Data Preview Table */}
          <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-56 bg-slate-950">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  {current.columns.map((col) => (
                    <th key={col.name} className="px-3 py-2 whitespace-nowrap font-medium">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {current.preview_rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    {current.columns.map((col) => (
                      <td key={col.name} className="px-3 py-1.5 whitespace-nowrap text-[11px]">
                        {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : "NULL"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
