"use client";

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { uploadFiles } from "@/lib/api";
import { TableSchema } from "@/types";

interface FileUploadProps {
  onTablesUpdated: (tables: TableSchema[]) => void;
  existingTables: TableSchema[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onTablesUpdated,
  existingTables,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const csvFiles = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith(".csv")
      );
      if (csvFiles.length === 0) {
        throw new Error("Please upload only CSV (.csv) files.");
      }
      const updated = await uploadFiles(csvFiles);
      onTablesUpdated(updated);
      setSuccessMsg(`Uploaded ${csvFiles.length} file(s) successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to upload files.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Datasets & Ingestion
        </h2>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300">
              Drag & drop CSV files or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Supports multi-file join analysis</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-indigo-400 py-1">
          <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Profiling and registering datasets...</span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Uploaded Tables List */}
      {existingTables.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <p className="text-xs font-medium text-slate-400 mb-2">Active Tables in Memory:</p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {existingTables.map((t) => (
              <div
                key={t.table_name}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-mono font-medium text-slate-200 truncate">{t.table_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400 font-mono">
                  <span>{t.row_count.toLocaleString()} rows</span>
                  <span className="text-slate-600">•</span>
                  <span>{t.column_count} cols</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
