"use client";

import React, { useState } from "react";
import { UserRole } from "@/types";
import { Sparkles, Shield, Key, Database, ChevronDown } from "lucide-react";

interface HeaderProps {
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  tableCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  onRoleChange,
  apiKey,
  onApiKeyChange,
  tableCount,
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSaveKey = () => {
    onApiKeyChange(tempKey);
    setShowKeyModal(false);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">AI Data Analyst</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Multi-Agent
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Powered by LangGraph, DuckDB & OpenRouter
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active tables badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>{tableCount} {tableCount === 1 ? "Table" : "Tables"} Active</span>
        </div>

        {/* RBAC Role Selector */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700/60 rounded-lg px-2.5 py-1">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-slate-400">Role:</span>
          <select
            value={userRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-xs font-semibold text-amber-300 focus:outline-none cursor-pointer"
          >
            <option value="Admin" className="bg-slate-900 text-slate-200">Admin</option>
            <option value="Analyst" className="bg-slate-900 text-slate-200">Analyst</option>
            <option value="Viewer" className="bg-slate-900 text-slate-200">Viewer</option>
          </select>
        </div>

        {/* OpenRouter API Key Setting */}
        <button
          onClick={() => setShowKeyModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
            apiKey
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/60"
          }`}
          title="Configure OpenRouter API Key"
        >
          <Key className="w-3.5 h-3.5 text-slate-400" />
          <span>{apiKey ? "API Key Set" : "OpenRouter Key"}</span>
        </button>
      </div>

      {/* Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" /> OpenRouter API Key
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Enter your free or paid OpenRouter API key. If omitted, the engine automatically uses its built-in zero-hallucination semantic query engine!
            </p>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-mono"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-md shadow-indigo-600/30"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

