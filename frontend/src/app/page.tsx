"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ChatMessage,
  ChatResponse,
  TableSchema,
  UserProfile,
  ConversationItem,
} from "@/types";
import {
  sendChatMessage,
  uploadFiles,
  fetchTables,
  loadSampleDatasets,
  fetchConversations,
  fetchConversation,
  deleteConversation as deleteConvApi,
} from "@/lib/api";
import { ReasoningViewer } from "@/components/ReasoningViewer";
import { ChartViewer } from "@/components/ChartViewer";
import { AnomalyViewer } from "@/components/AnomalyViewer";
import {
  Send,
  Plus,
  Paperclip,
  Code2,
  Table,
  BarChart2,
  Copy,
  Check,
  Download,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Database,
  Trash2,
  Upload,
  Sparkles,
  MessageSquare,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";

const SUGGESTIONS = [
  {
    title: "Regional Revenue",
    label: "Highest revenue by region",
    prompt: "Which region generated the highest revenue?",
    icon: "📈",
  },
  {
    title: "Monthly Trends",
    label: "Analyze sales seasonality",
    prompt: "Show monthly sales trends.",
    icon: "📅",
  },
  {
    title: "Top 5 Customers",
    label: "Multi-table join & spend ranking",
    prompt: "What are the top five customers?",
    icon: "🏆",
  },
  {
    title: "Detect Outliers",
    label: "IQR & Z-score anomaly detector",
    prompt: "Detect anomalies in the dataset.",
    icon: "⚠️",
  },
  {
    title: "Underperforming SKUs",
    label: "Identify slow inventory items",
    prompt: "Which products are underperforming?",
    icon: "📦",
  },
  {
    title: "Code Generation",
    label: "Generate SQL and Pandas syntax",
    prompt: "Generate SQL and pandas code for monthly sales trends",
    icon: "💻",
  },
];

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, "findings" | "chart" | "data" | "sql">>({});
  const [codeMode, setCodeMode] = useState<Record<string, "sql" | "pandas">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initial Load: Load persistent conversations and tables from database
  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // no auth stored
    }

    refreshConversations();
    fetchTables().then(setTables).catch(() => {});
  }, []);

  const refreshConversations = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (err) {
      console.error("Failed to fetch conversations from database:", err);
    }
  };

  // 2. Load conversation messages from database when activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    setLoadingHistory(true);
    fetchConversation(activeConvId)
      .then((detail) => {
        setMessages(detail.messages || []);
        // Initialize default tabs for assistant messages
        const initialTabs: Record<string, "findings" | "chart" | "data" | "sql"> = {};
        detail.messages.forEach((m) => {
          if (m.responsePayload?.chart && m.responsePayload.chart.type !== "none") {
            initialTabs[m.id] = "chart";
          } else {
            initialTabs[m.id] = "findings";
          }
        });
        setActiveTabs(initialTabs);
      })
      .catch((err) => {
        console.error("Error loading conversation history:", err);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [activeConvId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [inputValue]);

  // One-click sample dataset loader
  const handleLoadSamples = async () => {
    setLoading(true);
    setStatusNotice("Loading sample datasets (sales_transactions, customers, products)...");
    try {
      const updated = await loadSampleDatasets();
      setTables(updated);
      setStatusNotice(`Loaded 3 datasets into DuckDB virtual tables (${updated.map(t => t.table_name).join(", ")}).`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setStatusNotice(`Error loading samples: ${err.message}`);
      setTimeout(() => setStatusNotice(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const csvFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (csvFiles.length === 0) return;

    setLoading(true);
    setStatusNotice(`Uploading and profiling ${csvFiles.length} file(s)...`);
    try {
      const updated = await uploadFiles(csvFiles);
      setTables(updated);
      setStatusNotice(`Successfully profiled ${csvFiles.length} CSV dataset(s).`);
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (err: any) {
      setStatusNotice(`Upload error: ${err.message}`);
      setTimeout(() => setStatusNotice(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConvApi(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputValue;
    if (!text.trim() || loading) return;

    const currentSessionId = activeConvId || `conv-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: timestampStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const responsePayload = await sendChatMessage({
        sessionId: currentSessionId,
        message: text,
        tableNames: tables.map((t) => t.table_name),
        conversationHistory: history,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responsePayload.natural_language_answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        responsePayload,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActiveConvId(currentSessionId);

      // Refresh sidebar list to reflect database persistence
      refreshConversations();

      if (responsePayload.chart && responsePayload.chart.type !== "none") {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "chart" }));
      } else {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "findings" }));
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Failed to process analytical query."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportReport = (msg: ChatMessage) => {
    if (!msg.responsePayload) return;
    const r = msg.responsePayload;
    const report = `# Analytical Data Report
Generated: ${new Date().toLocaleString()}
Query: ${msg.content}

## Executive Summary
${r.natural_language_answer}

## Key Findings & Insights
${r.insights.map((ins) => `- ${ins}`).join("\n")}

${r.sql_query ? `## DuckDB SQL\n\`\`\`sql\n${r.sql_query}\n\`\`\`\n` : ""}
${r.python_code ? `## Idiomatic Pandas Code\n\`\`\`python\n${r.python_code}\n\`\`\`\n` : ""}

## Statistical Outliers
${r.anomalies.length > 0 ? r.anomalies.map((a) => `- Row ${a.record_index} [${a.column_name}]: ${a.explanation} (Score: ${a.score})`).join("\n") : "No anomalies detected."}
`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[#212121] text-[#ececec]">
      {/* ===== CHATGPT STYLE SIDEBAR ===== */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px]" : "w-0"
        } bg-[#171717] border-r border-[#2f2f2f] flex flex-col transition-all duration-200 overflow-hidden shrink-0 z-20`}
      >
        {/* Top: New Analysis Button */}
        <div className="p-3">
          <button
            onClick={() => {
              setActiveConvId(null);
              setMessages([]);
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#383838] bg-[#212121] hover:bg-[#2f2f2f] text-sm font-medium text-[#ececec] transition group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#8e8e8e] group-hover:text-white" />
              <span>New analysis</span>
            </div>
            <span className="text-[10px] text-[#6b6b6b] border border-[#383838] px-1 rounded">⌘K</span>
          </button>
        </div>

        {/* Saved Chat History (Stored in Database) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b]">
            Chat History
          </div>

          {conversations.length === 0 && (
            <p className="text-xs text-[#6b6b6b] text-center mt-6 px-4">
              No saved analyses yet. Queries are saved to your database automatically.
            </p>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${
                activeConvId === conv.id
                  ? "bg-[#2f2f2f] text-[#ececec] font-medium"
                  : "text-[#b4b4b4] hover:bg-[#2f2f2f]/60 hover:text-[#ececec]"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 text-[#8e8e8e] group-hover:text-[#ececec]" />
              <span className="truncate flex-1 text-xs">{conv.title}</span>
              <button
                onClick={(e) => handleDeleteConversation(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition"
                title="Delete from database"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Datasets / Tables Panel */}
        <div className="border-t border-[#2f2f2f] p-3 space-y-2 bg-[#171717]">
          <div className="flex items-center justify-between text-xs text-[#8e8e8e]">
            <div className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>{tables.length} dataset{tables.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={handleLoadSamples}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition"
              title="Load pre-built sales, customers, and products datasets"
            >
              <Sparkles className="w-3 h-3" />
              <span>Load Samples</span>
            </button>
          </div>

          {tables.length > 0 ? (
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {tables.map((t) => (
                <div
                  key={t.table_name}
                  className="flex items-center justify-between text-xs text-[#b4b4b4] font-mono px-2 py-1 rounded bg-[#212121] border border-[#2f2f2f]"
                >
                  <span className="truncate">{t.table_name}</span>
                  <span className="text-[#6b6b6b] text-[10px] shrink-0 ml-1">
                    {t.row_count.toLocaleString()}r
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border border-dashed border-[#383838] text-xs text-[#8e8e8e] hover:text-[#ececec] hover:border-[#555] transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV</span>
            </button>
          )}
        </div>

        {/* User / Settings Footer */}
        <div className="border-t border-[#2f2f2f] p-3 flex items-center justify-between bg-[#171717]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2f2f2f] border border-[#383838] flex items-center justify-center text-xs font-semibold text-[#ececec] shrink-0">
              <User className="w-4 h-4 text-[#ececec]" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-[#ececec] truncate">
                {user?.full_name || "Data Analyst Pro"}
              </p>
              <p className="text-[10px] text-[#6b6b6b] truncate">
                {user?.email || "PostgreSQL Persistent"}
              </p>
            </div>
          </div>
          <Link
            href="/terms"
            className="text-[11px] text-[#6b6b6b] hover:text-[#ececec] transition px-1"
            title="Terms & Privacy"
          >
            Legal
          </Link>
        </div>
      </aside>

      {/* ===== MAIN CHAT CANVAS ===== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Top Floating Bar */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-[#2f2f2f] shrink-0 bg-[#212121]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#2f2f2f] transition"
              title="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#2f2f2f] border border-[#383838] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-[#ececec]">Data Analyst</span>
              <span className="text-[11px] font-mono text-[#8e8e8e] bg-[#2f2f2f] px-2 py-0.5 rounded-full border border-[#383838]">
                DuckDB + Multi-Agent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusNotice && (
              <span className="text-xs text-amber-300 font-mono animate-pulse">
                {statusNotice}
              </span>
            )}
            <button
              onClick={handleLoadSamples}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2f2f2f] hover:bg-[#383838] text-[#ececec] border border-[#383838] transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Samples</span>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center text-sm text-[#8e8e8e]">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-2" />
              <span>Loading analysis history from database...</span>
            </div>
          ) : messages.length === 0 ? (
            /* ===== CHATGPT AUTHENTIC WELCOME SCREEN ===== */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#2f2f2f] border border-[#383838] flex items-center justify-center mb-4 shadow-sm">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-semibold text-[#ececec] mb-2 tracking-tight">
                What would you like to analyze today?
              </h2>
              <p className="text-sm text-[#8e8e8e] mb-8 text-center max-w-md">
                Ask natural language questions, generate deterministic DuckDB SQL, preview charts, and detect statistical outliers.
              </p>

              {/* 2x2 Interactive Query Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.prompt}
                    onClick={() => handleSend(s.prompt)}
                    disabled={loading}
                    className="group text-left p-4 rounded-xl border border-[#383838] bg-[#171717]/80 hover:bg-[#2f2f2f] transition text-[#ececec] hover:border-[#555] shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#ececec] group-hover:text-white">
                        {s.title}
                      </span>
                      <span className="text-base">{s.icon}</span>
                    </div>
                    <p className="text-xs text-[#8e8e8e] group-hover:text-[#b4b4b4]">
                      {s.label}
                    </p>
                  </button>
                ))}
              </div>

              {tables.length === 0 && (
                <div className="mt-8 flex items-center gap-3">
                  <button
                    onClick={handleLoadSamples}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Load 3 Sample Datasets</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#383838] bg-[#2f2f2f] hover:bg-[#383838] text-xs font-medium text-[#ececec] transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Your Own CSVs</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ===== CHAT MESSAGES STREAM ===== */
            <div className="max-w-3xl mx-auto w-full space-y-6 pb-28">
              {messages.map((m) => {
                const isUser = m.role === "user";
                const res = m.responsePayload;
                const currentTab = activeTabs[m.id] || "findings";
                const currentCode = codeMode[m.id] || "sql";

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    {isUser ? (
                      /* USER MESSAGE BUBBLE */
                      <div className="max-w-[85%] bg-[#2f2f2f] text-[#ececec] px-4 py-3 rounded-3xl rounded-tr-sm text-[15px] leading-relaxed shadow-sm">
                        {m.content}
                      </div>
                    ) : (
                      /* ASSISTANT RESPONSE */
                      <div className="w-full space-y-3">
                        {/* Assistant Avatar Header */}
                        <div className="flex items-center gap-2 pt-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-[#ececec]">Data Analyst</span>
                          <span className="text-[11px] text-[#6b6b6b]">{m.timestamp}</span>
                        </div>

                        <div className="pl-8 space-y-3">
                          {/* Reasoning Steps Accordion */}
                          {res?.reasoning_steps && res.reasoning_steps.length > 0 && (
                            <ReasoningViewer
                              steps={res.reasoning_steps}
                              executionTimeMs={res.execution_time_ms}
                            />
                          )}

                          {/* Executive Summary Markdown */}
                          <div className="prose-chat text-[15px] leading-relaxed text-[#ececec] whitespace-pre-wrap">
                            {m.content}
                          </div>

                          {/* Structured Analytical Tabs */}
                          {res && (
                            <div className="mt-4 pt-2 border-t border-[#2f2f2f] space-y-3">
                              {/* Tab Selector Toolbar */}
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-1 bg-[#171717] rounded-lg p-1 border border-[#2f2f2f]">
                                  <button
                                    onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "findings" }))}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                                      currentTab === "findings"
                                        ? "bg-[#2f2f2f] text-[#ececec] font-medium"
                                        : "text-[#8e8e8e] hover:text-[#ececec]"
                                    }`}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Findings</span>
                                  </button>

                                  {res.chart && res.chart.type !== "none" && (
                                    <button
                                      onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "chart" }))}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                                        currentTab === "chart"
                                          ? "bg-[#2f2f2f] text-[#ececec] font-medium"
                                          : "text-[#8e8e8e] hover:text-[#ececec]"
                                      }`}
                                    >
                                      <BarChart2 className="w-3.5 h-3.5" />
                                      <span>Chart</span>
                                    </button>
                                  )}

                                  {res.data_preview && res.data_preview.length > 0 && (
                                    <button
                                      onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "data" }))}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                                        currentTab === "data"
                                          ? "bg-[#2f2f2f] text-[#ececec] font-medium"
                                          : "text-[#8e8e8e] hover:text-[#ececec]"
                                      }`}
                                    >
                                      <Table className="w-3.5 h-3.5" />
                                      <span>Data ({res.total_data_rows})</span>
                                    </button>
                                  )}

                                  {(res.sql_query || res.python_code) && (
                                    <button
                                      onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "sql" }))}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                                        currentTab === "sql"
                                          ? "bg-[#2f2f2f] text-[#ececec] font-medium"
                                          : "text-[#8e8e8e] hover:text-[#ececec]"
                                      }`}
                                    >
                                      <Code2 className="w-3.5 h-3.5" />
                                      <span>Code & SQL</span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => copyToClipboard(m.content, m.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#2f2f2f] transition"
                                    title="Copy explanation"
                                  >
                                    {copiedId === m.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                    <span>Copy</span>
                                  </button>

                                  <button
                                    onClick={() => exportReport(m)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#2f2f2f] transition"
                                    title="Download Markdown Report"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Export</span>
                                  </button>
                                </div>
                              </div>

                              {/* TAB 1: Key Findings & Anomaly Alerts */}
                              {currentTab === "findings" && (
                                <div className="space-y-3">
                                  {res.insights && res.insights.length > 0 && (
                                    <div className="p-3.5 bg-[#171717] rounded-xl border border-[#2f2f2f] space-y-2">
                                      <span className="text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider block">
                                        Executive Takeaways
                                      </span>
                                      <ul className="space-y-1.5 text-sm text-[#d1d1d1] list-disc list-inside">
                                        {res.insights.map((ins, i) => (
                                          <li key={i} className="leading-relaxed">{ins}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {res.anomalies && res.anomalies.length > 0 && (
                                    <AnomalyViewer anomalies={res.anomalies} />
                                  )}
                                </div>
                              )}

                              {/* TAB 2: Dynamic Recharts Viewer */}
                              {currentTab === "chart" && res.chart && (
                                <ChartViewer chart={res.chart} data={res.data_preview} />
                              )}

                              {/* TAB 3: Data Table View */}
                              {currentTab === "data" && res.data_preview && (
                                <div className="border border-[#2f2f2f] rounded-xl overflow-x-auto max-h-72 bg-[#171717]">
                                  <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-[#212121] text-[#8e8e8e] sticky top-0 border-b border-[#2f2f2f]">
                                      <tr>
                                        {Object.keys(res.data_preview[0] || {}).map((col) => (
                                          <th key={col} className="px-3 py-2 whitespace-nowrap font-medium text-[#ececec]">
                                            {col}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2f2f2f] text-[#d1d1d1]">
                                      {res.data_preview.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[#212121]/50">
                                          {Object.keys(res.data_preview[0] || {}).map((col) => (
                                            <td key={col} className="px-3 py-1.5 whitespace-nowrap text-[11px]">
                                              {String(row[col])}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* TAB 4: Dual Code Viewer (DuckDB SQL + Idiomatic Pandas) */}
                              {currentTab === "sql" && (res.sql_query || res.python_code) && (
                                <div className="bg-[#171717] border border-[#2f2f2f] rounded-xl overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2 bg-[#212121] border-b border-[#2f2f2f]">
                                    <div className="flex items-center gap-1">
                                      {res.sql_query && (
                                        <button
                                          onClick={() => setCodeMode((p) => ({ ...p, [m.id]: "sql" }))}
                                          className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition ${
                                            currentCode === "sql"
                                              ? "bg-[#2f2f2f] text-white font-semibold border border-[#383838]"
                                              : "text-[#8e8e8e] hover:text-[#ececec]"
                                          }`}
                                        >
                                          DuckDB SQL
                                        </button>
                                      )}
                                      {res.python_code && (
                                        <button
                                          onClick={() => setCodeMode((p) => ({ ...p, [m.id]: "pandas" }))}
                                          className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition ${
                                            currentCode === "pandas"
                                              ? "bg-[#2f2f2f] text-white font-semibold border border-[#383838]"
                                              : "text-[#8e8e8e] hover:text-[#ececec]"
                                          }`}
                                        >
                                          Pandas (Python)
                                        </button>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => {
                                        const codeToCopy = (currentCode === "pandas" && res.python_code) ? res.python_code : res.sql_query || "";
                                        copyToClipboard(codeToCopy, `${m.id}-${currentCode}`);
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2f2f2f] hover:bg-[#383838] text-[#ececec] text-[11px] font-mono transition border border-[#383838]"
                                    >
                                      {copiedId === `${m.id}-${currentCode}` ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className="p-3.5 font-mono text-xs text-[#d1d1d1] overflow-x-auto">
                                    <pre>
                                      {(currentCode === "pandas" && res.python_code) ? res.python_code : res.sql_query}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-3 pl-1">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#2f2f2f] border border-[#383838] flex items-center gap-2.5 text-xs text-[#b4b4b4]">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="font-mono">Synthesizing SQL & executing multi-agent workflow...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ===== CHATGPT FLOATING PILL BOTTOM INPUT BAR ===== */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#212121] via-[#212121]/95 to-transparent z-10">
          <div className="max-w-3xl mx-auto">
            {/* Suggested Prompt Chips */}
            {messages.length > 0 && (
              <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.prompt}
                    onClick={() => handleSend(s.prompt)}
                    disabled={loading}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#171717] hover:bg-[#2f2f2f] text-[#b4b4b4] hover:text-[#ececec] border border-[#383838] transition shrink-0"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}

            {/* Pill Container */}
            <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-3xl border border-[#383838] p-2 px-3 shadow-lg focus-within:border-[#555] transition">
              {/* Attachment Paperclip Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#8e8e8e] hover:text-white rounded-full hover:bg-[#383838] transition shrink-0"
                title="Attach CSV dataset"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your data..."
                disabled={loading}
                rows={1}
                className="flex-1 bg-transparent text-[15px] text-[#ececec] placeholder-[#6b6b6b] resize-none focus:outline-none py-2 px-1 max-h-[180px] disabled:opacity-50 leading-relaxed font-sans"
              />

              {/* Circular Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || loading}
                className={`p-2.5 rounded-full transition shrink-0 ${
                  inputValue.trim() && !loading
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-[#424242] text-[#8e8e8e] cursor-not-allowed"
                }`}
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-center text-[11px] text-[#6b6b6b] mt-2">
              All questions, SQL queries, and answers are saved automatically to your database.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
