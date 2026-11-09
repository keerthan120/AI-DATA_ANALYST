"use client";

import React, { useState } from "react";
import { X, Table, FileSpreadsheet, Download, Sparkles, Database } from "lucide-react";
import { TableSchema } from "@/types";

interface DatasetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableSchema[];
  onSelectPrompt?: (prompt: string) => void;
}

export function DatasetViewerModal({
  isOpen,
  onClose,
  tables,
  onSelectPrompt,
}: DatasetViewerModalProps) {
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);

  if (!isOpen || tables.length === 0) return null;

  const currentTable = tables[selectedTableIdx] || tables[0];

  const handleDownloadCsv = () => {
    if (!currentTable.preview_rows || currentTable.preview_rows.length === 0) return;
    const cols = currentTable.columns.map((c) => c.name);
    const csvContent = [
      cols.join(","),
      ...currentTable.preview_rows.map((row) =>
        cols.map((col) => JSON.stringify(row[col] ?? "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTable.table_name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2cb8b2]/10 border border-[#2cb8b2]/20 flex items-center justify-center text-[#2cb8b2] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0f172a] truncate">
                  Dataset Viewer: {currentTable.table_name}.csv
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eefaf9] text-[#0f766e] font-semibold border border-[#b2e8e5]">
                  DuckDB Active
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                {currentTable.row_count.toLocaleString()} rows • {currentTable.column_count} columns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-table Tab selector if more than 1 dataset uploaded */}
        {tables.length > 1 && (
          <div className="px-6 pt-3 border-b border-[#e2e8f0] flex items-center gap-2 bg-slate-50 shrink-0 overflow-x-auto">
            {tables.map((t, idx) => (
              <button
                key={t.table_name}
                onClick={() => setSelectedTableIdx(idx)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  selectedTableIdx === idx
                    ? "border-[#2cb8b2] text-[#0f766e] bg-white"
                    : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{t.table_name}.csv</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Column Profile Summary Cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>Column Schema & Data Types</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {currentTable.columns.map((col) => (
                <div
                  key={col.name}
                  className="p-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-left"
                >
                  <p className="text-xs font-bold text-[#0f172a] truncate" title={col.name}>
                    {col.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#64748b] mt-1">
                    <span className="font-mono text-[#0f766e] bg-[#eefaf9] px-1.5 py-0.5 rounded">
                      {col.dtype}
                    </span>
                    <span>{col.null_count === 0 ? "100% full" : `${col.null_count} nulls`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Records Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-[#2cb8b2]" />
                <span>Records Preview (First {currentTable.preview_rows.length} rows)</span>
              </h4>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-bold">
                  <tr>
                    <th className="p-2.5 pl-3 border-r border-[#e2e8f0] w-12 text-center text-[#94a3b8]">#</th>
                    {currentTable.columns.map((col) => (
                      <th key={col.name} className="p-2.5 font-semibold border-r border-[#e2e8f0] whitespace-nowrap">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] bg-white">
                  {currentTable.preview_rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#f8fafc]/80 transition">
                      <td className="p-2.5 pl-3 border-r border-[#e2e8f0] text-center font-mono text-[11px] text-[#94a3b8]">
                        {rIdx + 1}
                      </td>
                      {currentTable.columns.map((col) => (
                        <td
                          key={col.name}
                          className="p-2.5 border-r border-[#e2e8f0] text-[#0f172a] whitespace-nowrap"
                        >
                          {row[col.name] !== null && row[col.name] !== undefined
                            ? String(row[col.name])
                            : <span className="text-slate-300 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer with AI prompt launcher */}
        <div className="px-6 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between shrink-0">
          <p className="text-xs text-[#64748b]">
            Loaded into DuckDB engine. Ready for natural language analytics, joins, and visualizations.
          </p>
          <button
            onClick={() => {
              if (onSelectPrompt) {
                onSelectPrompt(`Explain and provide an analytical overview of the uploaded dataset '${currentTable.table_name}'.`);
              }
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2cb8b2] hover:bg-[#23a8a2] text-white text-xs font-semibold transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze Dataset with AI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
