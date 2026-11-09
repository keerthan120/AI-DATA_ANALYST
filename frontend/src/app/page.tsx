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
  fetchConversations,
  fetchConversation,
  deleteConversation as deleteConvApi,
} from "@/lib/api";
import { ReasoningViewer } from "@/components/ReasoningViewer";
import { ChartViewer } from "@/components/ChartViewer";
import { AnomalyViewer } from "@/components/AnomalyViewer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
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
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  LineChart as LineChartIcon,
  LogOut,
} from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user from localStorage (supports auth_user and data_analyst_user)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth_user") || localStorage.getItem("data_analyst_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        loadConversations(parsed.id);
      } else {
        loadConversations();
      }
    } catch (e) {
      console.error("Failed to parse user profile:", e);
      loadConversations();
    }
  }, []);

  const loadConversations = async (userId?: number) => {
    try {
      const convs = await fetchConversations(userId);
      setConversations(convs);
    } catch (err) {
      console.error("Error loading database conversations:", err);
    }
  };

  const updateDynamicSuggestions = (tableList: TableSchema[]) => {
    if (!tableList || tableList.length === 0) {
      setDynamicSuggestions([]);
      return;
    }
    const t = tableList[0];
    const numCol = t.columns.find((c) =>
      ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT"].some((type) => c.dtype.toUpperCase().includes(type))
    );
    const catCol = t.columns.find(
      (c) =>
        !["INT", "DOUBLE", "FLOAT", "DECIMAL", "DATE", "TIME"].some((type) => c.dtype.toUpperCase().includes(type))
    );
    const dateCol = t.columns.find((c) =>
      ["DATE", "TIME", "TIMESTAMP"].some((type) => c.dtype.toUpperCase().includes(type)) ||
      c.name.toLowerCase().includes("date")
    );

    const suggestions: string[] = [];
    suggestions.push(`Explain and provide an analytical overview of dataset '${t.table_name}'`);
    if (catCol && numCol) {
      suggestions.push(`Which ${catCol.name} generated the highest ${numCol.name}?`);
      suggestions.push(`What are the top 5 ${catCol.name}s by total ${numCol.name}?`);
    }
    if (dateCol && numCol) {
      suggestions.push(`Show trend of ${numCol.name} over ${dateCol.name}`);
      suggestions.push(`Forecast ${numCol.name} for the next 4 periods`);
    } else if (catCol) {
      suggestions.push(`Show distribution of records across ${catCol.name}`);
    }
    suggestions.push(`Run data quality and hygiene audit on ${t.table_name}`);
    if (numCol) {
      suggestions.push(`Detect statistical anomalies and outliers in ${numCol.name}`);
    } else {
      suggestions.push(`Detect statistical anomalies in this dataset`);
    }
    setDynamicSuggestions(suggestions);
  };

  // Load selected conversation from DB and scope tables to it
  useEffect(() => {
    if (!activeConvId) {
      setTables([]);
      setDynamicSuggestions([]);
      return;
    }
    setLoadingHistory(true);
    fetchConversation(activeConvId)
      .then(async (detail) => {
        const loaded: ChatMessage[] = detail.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.timestamp,
          responsePayload: m.responsePayload || undefined,
        }));
        setMessages(loaded);

        // Fetch tables scoped to this conversation
        try {
          const convTables = await fetchTables(activeConvId);
          setTables(convTables);
          updateDynamicSuggestions(convTables);
        } catch {
          setTables([]);
        }
      })
      .catch((err) => {
        console.error("Error loading conversation history from database:", err);
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

  // Handle CSV file upload strictly scoped to active or new conversation
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const csvFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (csvFiles.length === 0) {
      setStatusNotice("Please upload valid CSV files (.csv).");
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    setLoading(true);
    setStatusNotice(`Uploading and profiling ${csvFiles.length} file(s)...`);
    
    // Ensure we have a conversation ID to scope files to
    const targetConvId = activeConvId || `conv-${Date.now()}`;
    if (!activeConvId) {
      setActiveConvId(targetConvId);
    }

    try {
      const updated = await uploadFiles(csvFiles, targetConvId);
      setTables(updated);
      updateDynamicSuggestions(updated);

      const firstUploaded = updated[updated.length - 1] || updated[0];
      setStatusNotice(`Successfully profiled '${firstUploaded.file_name}' into DuckDB for this chat.`);
      setTimeout(() => setStatusNotice(null), 3000);

      // Immediately trigger understanding and explanation for the uploaded file!
      await handleSend(
        `Explain and provide an analytical overview of the uploaded dataset '${firstUploaded.table_name}'.`,
        targetConvId
      );
    } catch (err: any) {
      setStatusNotice(`Upload error: ${err.message}`);
      setTimeout(() => setStatusNotice(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConvApi(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSend = async (queryText?: string, explicitSessionId?: string) => {
    const text = queryText || inputValue;
    if (!text.trim() || loading) return;

    const currentSessionId = explicitSessionId || activeConvId || `conv-${Date.now()}`;
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
        userId: user?.id,
        conversationHistory: history,
      });

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: responsePayload.natural_language_answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        responsePayload: responsePayload,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Set active conversation and refresh conversation list from database
      if (!activeConvId) {
        setActiveConvId(responsePayload.session_id);
      }
      loadConversations(user?.id);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Error generating response: ${err.message}. Please check if the backend service is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setTables([]);
    setDynamicSuggestions([]);
  };

  const handleSignOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("data_analyst_user");
    setUser(null);
    startNewChat();
    loadConversations();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = (data: any[], filename = "data_export.csv") => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] !== undefined ? row[h] : "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAnalysisReport = () => {
    if (messages.length === 0) return;
    let md = `# Executive Data Analysis Report\n`;
    md += `*Generated by AI Data Analyst on ${new Date().toLocaleString()}*\n\n`;
    if (tables.length > 0) {
      md += `## Active Datasets\n`;
      tables.forEach((t) => {
        md += `- **${t.file_name}** (${t.row_count.toLocaleString()} rows, ${t.column_count} columns)\n`;
      });
      md += `\n---\n\n`;
    }
    messages.forEach((m) => {
      if (m.role === "user") {
        md += `### User Query:\n> ${m.content}\n\n`;
      } else {
        md += `### Analysis & Findings:\n${m.content}\n\n`;
        if (m.responsePayload?.insights?.length) {
          md += `**Key Strategic Insights:**\n`;
          m.responsePayload.insights.forEach((ins) => (md += `- ${ins}\n`));
          md += `\n`;
        }
        if (m.responsePayload?.sql_query) {
          md += `\`\`\`sql\n${m.responsePayload.sql_query}\n\`\`\`\n\n`;
        }
      }
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analysis_report_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[#212121] text-[#ececec]">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* LEFT SIDEBAR (ChatGPT Style #171717) */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px]" : "w-0"
        } bg-[#171717] border-r border-[#2f2f2f] flex flex-col transition-all duration-200 overflow-hidden shrink-0 z-20`}
      >
        {/* Top: New Chat Button */}
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#383838] bg-[#212121] hover:bg-[#2f2f2f] text-sm font-medium text-[#ececec] transition group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#8e8e8e] group-hover:text-white" />
              <span>New analysis</span>
            </div>
            <span className="text-[10px] text-[#6b6b6b] border border-[#383838] px-1 rounded">⌘K</span>
          </button>
        </div>

        {/* Database Conversations List (Recent Chats) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b] flex items-center justify-between">
            <span>Recent Chats</span>
            <span className="text-[10px] font-normal text-[#8e8e8e]">
              {conversations.length}
            </span>
          </div>

          {conversations.length === 0 ? (
            <p className="text-xs text-[#6b6b6b] text-center mt-6 px-4">
              No saved analyses yet. Queries are saved to your database automatically.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                  activeConvId === conv.id
                    ? "bg-[#2f2f2f] text-[#ececec] font-medium"
                    : "text-[#b4b4b4] hover:bg-[#212121] hover:text-[#ececec]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#8e8e8e]" />
                  <span className="truncate">{conv.title || "Untitled Analysis"}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[#8e8e8e] transition rounded"
                  title="Delete from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Active Datasets Section for THIS Chat */}
        <div className="border-t border-[#2f2f2f] p-3 space-y-2 bg-[#171717]">
          <div className="flex items-center justify-between text-xs text-[#8e8e8e]">
            <div className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>Chat Files ({tables.length})</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition"
              title="Upload CSV to this chat"
            >
              <Upload className="w-3 h-3" />
              <span>Upload CSV</span>
            </button>
          </div>

          {tables.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {tables.map((t) => (
                <div
                  key={t.table_name}
                  onClick={() =>
                    handleSend(`Explain and provide an analytical overview of dataset '${t.table_name}'`)
                  }
                  className="flex items-center justify-between px-2 py-1.5 rounded bg-[#212121] border border-[#2f2f2f] text-xs text-[#b4b4b4] hover:text-[#ececec] hover:border-[#383838] cursor-pointer transition"
                  title="Click to profile this table"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{t.file_name}</span>
                  </div>
                  <span className="text-[10px] text-[#6b6b6b] shrink-0 font-mono">
                    {t.row_count.toLocaleString()}r
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#6b6b6b] italic">No CSVs uploaded in this chat yet.</p>
          )}
        </div>

        {/* User Profile Bar */}
        <div className="border-t border-[#2f2f2f] p-3 flex items-center justify-between bg-[#171717]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2f2f2f] border border-[#383838] flex items-center justify-center text-xs font-semibold text-[#ececec] shrink-0">
              <User className="w-4 h-4 text-[#ececec]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#ececec] truncate">
                {user ? (user.full_name || user.email) : "Guest Analyst"}
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] text-[#8e8e8e] truncate">PostgreSQL Persistent</p>
              </div>
            </div>
          </div>
          {user ? (
            <button
              onClick={handleSignOut}
              className="p-1.5 text-[#8e8e8e] hover:text-[#ececec] transition rounded hover:bg-[#212121]"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href="/login"
              className="text-[11px] text-[#8e8e8e] hover:text-[#ececec] transition px-2 py-1 rounded hover:bg-[#212121]"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 flex flex-col h-screen min-w-0 bg-[#212121] relative">
        {/* Top Header */}
        <header className="h-12 border-b border-[#2f2f2f] flex items-center justify-between px-4 bg-[#212121] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#2f2f2f] transition"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#ececec]">Data Analyst</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2f2f2f] border border-[#383838] text-[#8e8e8e]">
                DuckDB + LangGraph
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={exportAnalysisReport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#383838] bg-[#2f2f2f] hover:bg-[#383838] text-xs font-medium text-[#ececec] transition"
                title="Download complete report as Markdown"
              >
                <Download className="w-3.5 h-3.5 text-[#8e8e8e]" />
                <span>Export Report</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#383838] bg-[#2f2f2f] hover:bg-[#383838] text-xs font-medium text-[#ececec] transition"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload CSV</span>
            </button>
          </div>
        </header>

        {/* Status Notification Banner */}
        {statusNotice && (
          <div className="bg-[#2f2f2f] border-b border-[#383838] px-4 py-2 text-xs text-[#ececec] flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-[#8e8e8e] hover:text-white text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Central Chat / Empty State Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* If no messages: Display ChatGPT Hero & Prominent CSV Dropzone */}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center pt-8 pb-12">
                <div className="w-12 h-12 rounded-2xl bg-[#2f2f2f] border border-[#383838] flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="w-6 h-6 text-[#10a37f]" />
                </div>
                <h1 className="text-2xl font-semibold text-[#ececec] mb-2">
                  What would you like to analyze today?
                </h1>
                <p className="text-sm text-[#8e8e8e] max-w-md mb-8">
                  Upload one or more CSV files for this conversation. The AI Data Analyst will immediately
                  understand the structure, evaluate data quality, and generate actionable insights.
                </p>

                {/* Drag & Drop Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-xl p-8 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-[#383838] hover:border-[#555] bg-[#2f2f2f]/40 hover:bg-[#2f2f2f]/70"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#2f2f2f] border border-[#383838] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-[#ececec] mb-1">
                    Drag and drop your CSV file(s) here, or <span className="text-emerald-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-[#8e8e8e]">
                    Files uploaded belong strictly to this conversation. Supports multi-file joins, forecasting & anomalies.
                  </p>
                </div>

                {/* Dynamic Suggestion Chips if a dataset is already registered */}
                {dynamicSuggestions.length > 0 && (
                  <div className="w-full max-w-xl mt-8">
                    <div className="flex items-center gap-1.5 text-xs text-[#8e8e8e] mb-3 justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Suggested analytical questions for active dataset:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {dynamicSuggestions.map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(promptText)}
                          className="p-3 rounded-xl border border-[#383838] bg-[#2f2f2f]/60 hover:bg-[#2f2f2f] hover:border-[#555] text-xs text-[#ececec] transition group flex items-start gap-2"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-[#8e8e8e] group-hover:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{promptText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Message Thread */
              messages.map((msg) => {
                const payload = msg.responsePayload;
                const activeTab = activeTabs[msg.id] || "findings";
                const isPandas = codeMode[msg.id] === "pandas";

                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-[#2f2f2f] text-[#ececec] text-sm leading-relaxed border border-[#383838]">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className="block text-[10px] text-[#8e8e8e] mt-1.5 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Assistant Response
                return (
                  <div key={msg.id} className="flex gap-3 text-sm text-[#ececec]">
                    <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0 text-white mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-4 min-w-0">
                      {/* Collapsible Reasoning Process */}
                      {payload?.reasoning_steps && payload.reasoning_steps.length > 0 && (
                        <ReasoningViewer
                          steps={payload.reasoning_steps}
                          executionTimeMs={payload.execution_time_ms}
                        />
                      )}

                      {/* Natural Language Answer / Dataset Overview */}
                      <div className="bg-[#282828] p-5 rounded-xl border border-[#333]">
                        <MarkdownRenderer content={msg.content} />
                      </div>

                      {/* Strategic Insights Cards */}
                      {payload?.insights && payload.insights.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider">
                            Key Analytical Insights
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {payload.insights.map((insight, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[#282828] border border-[#383838] text-xs text-[#ececec]"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                                <span className="leading-relaxed">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Tab Navigation */}
                      {payload && (
                        <div className="rounded-xl border border-[#383838] bg-[#282828] overflow-hidden">
                          <div className="flex items-center justify-between border-b border-[#383838] px-3 bg-[#212121]">
                            <div className="flex space-x-1">
                              {payload.chart && payload.chart.type !== "none" && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [msg.id]: "chart" }))}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
                                    activeTab === "chart"
                                      ? "border-emerald-400 text-emerald-400"
                                      : "border-transparent text-[#8e8e8e] hover:text-[#ececec]"
                                  }`}
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  <span>Visual Chart</span>
                                </button>
                              )}

                              {payload.data_preview && payload.data_preview.length > 0 && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [msg.id]: "data" }))}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
                                    activeTab === "data" || (!payload.chart && activeTab === "findings")
                                      ? "border-emerald-400 text-emerald-400"
                                      : "border-transparent text-[#8e8e8e] hover:text-[#ececec]"
                                  }`}
                                >
                                  <Table className="w-3.5 h-3.5" />
                                  <span>Data Table ({payload.total_data_rows || payload.data_preview.length})</span>
                                </button>
                              )}

                              {(payload.sql_query || payload.python_code) && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [msg.id]: "sql" }))}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
                                    activeTab === "sql"
                                      ? "border-emerald-400 text-emerald-400"
                                      : "border-transparent text-[#8e8e8e] hover:text-[#ececec]"
                                  }`}
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>Code (SQL & Pandas)</span>
                                </button>
                              )}
                            </div>

                            {/* Export CSV for active data */}
                            {payload.data_preview && payload.data_preview.length > 0 && (
                              <button
                                onClick={() => exportCSV(payload.data_preview, `analysis_${Date.now()}.csv`)}
                                className="flex items-center gap-1 text-[11px] text-[#8e8e8e] hover:text-[#ececec] transition px-2 py-1 rounded"
                                title="Export results to CSV"
                              >
                                <Download className="w-3 h-3" />
                                <span>Export CSV</span>
                              </button>
                            )}
                          </div>

                          {/* Tab Content Panes */}
                          <div className="p-4">
                            {/* Chart View */}
                            {activeTab === "chart" && payload.chart && (
                              <ChartViewer
                                chart={payload.chart}
                                data={payload.data_preview}
                              />
                            )}

                            {/* Data Table View */}
                            {(activeTab === "data" || (!payload.chart && activeTab === "findings")) &&
                              payload.data_preview &&
                              payload.data_preview.length > 0 && (
                                <div className="overflow-x-auto max-h-72 scrollbar-thin">
                                  <table className="w-full text-left text-xs border-collapse font-sans">
                                    <thead>
                                      <tr className="border-b border-[#383838] bg-[#212121] text-[#8e8e8e]">
                                        {Object.keys(payload.data_preview[0]).map((h) => (
                                          <th key={h} className="px-3 py-2 font-medium">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#383838]">
                                      {payload.data_preview.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-[#212121]/50">
                                          {Object.keys(payload.data_preview[0]).map((h) => (
                                            <td key={h} className="px-3 py-2 text-[#ececec]">
                                              {typeof row[h] === "number"
                                                ? row[h].toLocaleString()
                                                : String(row[h] !== null && row[h] !== undefined ? row[h] : "")}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                            {/* SQL & Pandas Code View */}
                            {activeTab === "sql" && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setCodeMode((p) => ({ ...p, [msg.id]: "sql" }))}
                                      className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                                        !isPandas
                                          ? "bg-[#383838] text-white"
                                          : "text-[#8e8e8e] hover:text-white"
                                      }`}
                                    >
                                      DuckDB SQL
                                    </button>
                                    <button
                                      onClick={() => setCodeMode((p) => ({ ...p, [msg.id]: "pandas" }))}
                                      className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                                        isPandas
                                          ? "bg-[#383838] text-white"
                                          : "text-[#8e8e8e] hover:text-white"
                                      }`}
                                    >
                                      Pandas (Python)
                                    </button>
                                  </div>

                                  <button
                                    onClick={() =>
                                      copyCode(
                                        isPandas
                                          ? payload.python_code || ""
                                          : payload.sql_query || "",
                                        msg.id
                                      )
                                    }
                                    className="flex items-center gap-1 text-xs text-[#8e8e8e] hover:text-[#ececec] transition px-2 py-1 rounded bg-[#212121] border border-[#383838]"
                                  >
                                    {copiedId === msg.id ? (
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

                                <pre className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                                  <code>
                                    {isPandas
                                      ? payload.python_code || "# No Pandas code generated"
                                      : payload.sql_query || "-- No SQL query generated"}
                                  </code>
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Outliers & Anomaly Viewer */}
                      {payload?.anomalies && payload.anomalies.length > 0 && (
                        <AnomalyViewer anomalies={payload.anomalies} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-3 text-sm text-[#ececec]">
                <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0 text-white">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 rounded-xl bg-[#282828] border border-[#383838] flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-[#8e8e8e]">
                    Profiling schema, executing DuckDB query, and generating insights...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* BOTTOM FLOATING INPUT BOX (ChatGPT Style) */}
        <div className="p-4 bg-[#212121] shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-[#2f2f2f] rounded-2xl border border-[#383838] focus-within:border-[#555] p-2 transition shadow-lg">
              {/* File Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-full text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#383838] transition shrink-0"
                title="Upload CSV to this chat"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  tables.length > 0
                    ? `Ask anything about ${tables.map(t => t.file_name).join(", ")}...`
                    : "Say 'hi', upload CSVs, or ask any data analysis question..."
                }
                rows={1}
                disabled={loading}
                className="w-full bg-transparent text-sm text-[#ececec] placeholder-[#6b6b6b] resize-none focus:outline-none py-2 px-1 max-h-[180px] disabled:opacity-50 leading-relaxed font-sans"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputValue.trim()}
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
              AI Data Analyst executes deterministic DuckDB SQL & Pandas code. All chat history is saved to your database.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
