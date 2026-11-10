"use client";

import React, { useState, useEffect } from "react";
import { X, Table, FileSpreadsheet, Download, Sparkles, Database, Search, ArrowUpDown, Upload } from "lucide-react";
import { TableSchema } from "@/types";
import { fetchTables } from "@/lib/api";

interface DatasetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableSchema[];
  initialTableIndex?: number;
  onSelectPrompt?: (prompt: string) => void;
  onUploadClick?: () => void;
}

export function DatasetViewerModal({
  isOpen,
  onClose,
  tables,
  initialTableIndex = 0,
  onSelectPrompt,
  onUploadClick,
}: DatasetViewerModalProps) {
  const [selectedTableIdx, setSelectedTableIdx] = useState(initialTableIndex);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTables, setActiveTables] = useState<TableSchema[]>(tables);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTables(tables || []);
    if (initialTableIndex !== undefined && initialTableIndex < (tables?.length || 0)) {
      setSelectedTableIdx(initialTableIndex);
    } else if (selectedTableIdx >= (tables?.length || 0)) {
      setSelectedTableIdx(0);
    }
  }, [tables, isOpen, initialTableIndex]);

  if (!isOpen) return null;

  const currentTable = activeTables[selectedTableIdx] || activeTables[0];

  const handleDownloadCsv = () => {
    if (!currentTable || !currentTable.preview_rows || currentTable.preview_rows.length === 0) return;
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

  // Filter preview rows by search term
  const filteredRows = currentTable?.preview_rows
    ? currentTable.preview_rows.filter((row) => {
        if (!searchTerm) return true;
        return Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2cb8b2]/10 border border-[#2cb8b2]/20 flex items-center justify-center text-[#2cb8b2] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0f172a] truncate">
                  {currentTable ? `Dataset Viewer: ${currentTable.table_name}.csv` : "Dataset Table Viewer"}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eefaf9] text-[#0f766e] font-semibold border border-[#b2e8e5]">
                  DuckDB In-Memory Engine
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                {currentTable
                  ? `${currentTable.row_count.toLocaleString()} rows • ${currentTable.column_count} columns • 100% active schema`
                  : "View table schemas, rows, and data distributions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentTable && (
              <button
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#2cb8b2]" />
                <span>Download CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-table Tab selector */}
        {activeTables.length > 1 && (
          <div className="px-6 pt-3 border-b border-[#e2e8f0] flex items-center gap-2 bg-slate-50 shrink-0 overflow-x-auto">
            {activeTables.map((t, idx) => (
              <button
                key={t.table_name}
                onClick={() => {
                  setSelectedTableIdx(idx);
                  setSearchTerm("");
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  selectedTableIdx === idx
                    ? "border-[#2cb8b2] text-[#0f766e] bg-white shadow-2xs"
                    : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{t.table_name}.csv</span>
                <span className="text-[10px] font-mono opacity-70">({t.row_count.toLocaleString()})</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!currentTable ? (
            <div className="py-16 text-center space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-[#94a3b8] mx-auto" />
              <p className="text-sm font-semibold text-[#334155]">No CSV files loaded in working memory yet.</p>
              <p className="text-xs text-[#64748b] max-w-sm mx-auto">
                Upload one or more CSV files in the chat, or click below to attach files.
              </p>
              {onUploadClick && (
                <button
                  onClick={() => {
                    onClose();
                    onUploadClick();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2cb8b2] hover:bg-[#23a8a2] text-white text-xs font-medium transition shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload CSV Files</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Column Profile Summary Cards */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-3 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#2cb8b2]" />
                  <span>Column Schema & Data Types ({currentTable.columns.length})</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {currentTable.columns.map((col) => (
                    <div
                      key={col.name}
                      className="p-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-left hover:border-[#b2e8e5] transition"
                    >
                      <p className="text-xs font-bold text-[#0f172a] truncate" title={col.name}>
                        {col.name}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-[#64748b]">
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                          {col.dtype}
                        </span>
                        <span>{col.null_count > 0 ? `${col.null_count} nulls` : "0 nulls"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Rows Preview with Live Search Filter */}
              <div>
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-[#2cb8b2]" />
                      <span>Data Rows Preview</span>
                    </h4>
                    <span className="text-[11px] text-[#94a3b8]">
                      (Showing {filteredRows.length} of {currentTable.preview_rows.length} rows)
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter rows by keyword..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
                    />
                  </div>
                </div>

                <div className="border border-[#e2e8f0] rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase tracking-wider w-12 text-center">
                          #
                        </th>
                        {currentTable.columns.map((col) => (
                          <th
                            key={col.name}
                            className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap"
                          >
                            <div className="flex items-center gap-1">
                              <span>{col.name}</span>
                              <span className="text-[9px] font-normal text-[#94a3b8] font-mono lowercase">
                                ({col.dtype})
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={currentTable.columns.length + 1}
                            className="text-center py-8 text-xs text-[#94a3b8]"
                          >
                            No rows matched your search term "{searchTerm}".
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#f8fafc] transition font-mono text-[11px]">
                            <td className="py-2 px-3 text-[#94a3b8] text-center">{idx + 1}</td>
                            {currentTable.columns.map((col) => {
                              const val = row[col.name];
                              const isNumeric = typeof val === "number";
                              return (
                                <td
                                  key={col.name}
                                  className={`py-2 px-3 whitespace-nowrap ${
                                    isNumeric ? "text-right font-medium text-[#0f172a]" : "text-[#334155]"
                                  }`}
                                >
                                  {val !== null && val !== undefined ? (
                                    isNumeric && col.name.includes("inr") ? (
                                      `₹${val.toLocaleString()}`
                                    ) : (
                                      String(val)
                                    )
                                  ) : (
                                    <span className="text-slate-300 italic">null</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
