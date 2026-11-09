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
        throw new Error("Please upload valid CSV (.csv) files.");
      }
      const updated = await uploadFiles(csvFiles);
      onTablesUpdated(updated);
      setSuccessMsg(`Uploaded ${csvFiles.length} file(s) successfully.`);
    } catch (err: any) {
      setError(err.message || "Failed to upload files.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-zinc-400" /> Dataset Ingestion
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
        className={`border border-dashed rounded-md p-6 text-center cursor-pointer transition ${
          isDragging
            ? "border-zinc-400 bg-zinc-800/40"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/60"
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
          <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-300">
              Drop CSV files here or <span className="text-zinc-100 underline">browse</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Supports multi-file joins via foreign keys</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-400 py-1">
          <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <span>Profiling schema and registering tables...</span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-md bg-red-950/40 border border-red-900 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-md bg-emerald-950/40 border border-emerald-900 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Uploaded Tables List */}
      {existingTables.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Registered Tables:</p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {existingTables.map((t) => (
              <div
                key={t.table_name}
                className="flex items-center justify-between p-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono"
              >
                <span className="text-zinc-200 truncate">{t.table_name}</span>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-500">
                  <span>{t.row_count.toLocaleString()} rows</span>
                  <span>/</span>
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
