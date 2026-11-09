"use client";

import React, { useState, useEffect } from "react";
import { X, Key, Cpu, Sliders, Database, RotateCcw, Check, Sparkles } from "lucide-react";
import { clearCacheApi } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  maxRows: number;
  anomalyThreshold: number;
  currency: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  model: "google/gemini-2.0-flash",
  maxRows: 100,
  anomalyThreshold: 2.5,
  currency: "INR",
};

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await clearCacheApi();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    } catch (e) {
      console.error("Failed to clear cache:", e);
    } finally {
      setClearingCache(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("analyst_settings");
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem("analyst_settings", JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onSaved) onSaved();
        onClose();
      }, 700);
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("analyst_settings");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#e2e8f0] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2cb8b2]/10 border border-[#2cb8b2]/20 flex items-center justify-center text-[#2cb8b2]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Settings & Configuration</h3>
              <p className="text-xs text-[#64748b]">Configure AI models, engine parameters, and caching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section: LLM Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#334155] flex items-center gap-1.5 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>Inference Model</span>
            </label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3 py-2.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2]"
            >
              <option value="google/gemini-2.0-flash">Google Gemini 2.0 Flash (Fast & Accurate)</option>
              <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (Advanced Reasoning)</option>
              <option value="openai/gpt-4o">OpenAI GPT-4o (Multimodal Data Engine)</option>
              <option value="deepseek/deepseek-chat">DeepSeek V3 (High-Precision SQL Code)</option>
              <option value="meta-llama/llama-3.3-70b-instruct">Meta Llama 3.3 70B (Open Weights)</option>
            </select>
            <p className="text-[11px] text-[#64748b]">
              Selected model handles natural language intent decomposition, SQL synthesis, and executive summaries.
            </p>
          </div>

          {/* Section: Custom OpenRouter API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155] flex items-center gap-1.5 uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 text-[#2cb8b2]" />
                <span>OpenRouter API Key (Optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-[#2cb8b2] hover:underline"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-or-v1-..."
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3 py-2.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2cb8b2] focus:ring-1 focus:ring-[#2cb8b2] font-mono"
            />
            <p className="text-[11px] text-[#64748b]">
              Leave blank to use the backend's pre-configured high-precision semantic engine.
            </p>
          </div>

          {/* Section: Max Result Rows & Anomaly Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#334155]">Max Result Rows</label>
              <select
                value={settings.maxRows}
                onChange={(e) => setSettings({ ...settings, maxRows: Number(e.target.value) })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#2cb8b2]"
              >
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={500}>500 rows</option>
                <option value={1000}>1,000 rows</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#334155]">Outlier Threshold (|Z|)</label>
              <select
                value={settings.anomalyThreshold}
                onChange={(e) => setSettings({ ...settings, anomalyThreshold: Number(e.target.value) })}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#2cb8b2]"
              >
                <option value={2.0}>Z &gt; 2.0 (Strict)</option>
                <option value={2.5}>Z &gt; 2.5 (Standard)</option>
                <option value={3.0}>Z &gt; 3.0 (Severe Only)</option>
              </select>
            </div>
          </div>

          {/* Section: Cache Status */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2cb8b2]" />
              <div>
                <p className="text-xs font-medium text-[#0f172a]">In-Memory Query Cache</p>
                <p className="text-[11px] text-[#64748b]">Active LRU caching for instant &lt;1ms responses</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearingCache}
              className="px-2.5 py-1 text-xs font-medium border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] text-[#334155] rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {cacheCleared ? (
                <>
                  <Check className="w-3 h-3 text-[#2cb8b2]" />
                  <span>Cleared!</span>
                </>
              ) : clearingCache ? (
                <span>Clearing...</span>
              ) : (
                <span>Clear Cache</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#0f172a] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#e2e8f0] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2cb8b2] hover:bg-[#23a8a2] rounded-xl transition shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
