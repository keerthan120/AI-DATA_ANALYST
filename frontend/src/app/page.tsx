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
import { BrandLogo } from "@/components/BrandLogo";
import { SettingsModal } from "@/components/SettingsModal";
import { DatasetViewerModal } from "@/components/DatasetViewerModal";
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
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Upload,
  Sparkles,
  MessageSquare,
  Bot,
  User,
  Settings as SettingsIcon,
  TrendingUp,
  FileSpreadsheet,
  LogOut,
  X,
  FileText,
} from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [datasetViewerOpen, setDatasetViewerOpen] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, "findings" | "chart" | "data" | "sql">>({});
  const [codeMode, setCodeMode] = useState<Record<string, "sql" | "pandas">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [greetingText, setGreetingText] = useState("Welcome");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Time-aware greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreetingText("Good morning");
    else if (hour < 17) setGreetingText("Good afternoon");
    else setGreetingText("Good evening");
  }, []);

  // Load user from localStorage
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
    if (catCol && numCol) {
      suggestions.push(`Which ${catCol.name} generated the highest ${numCol.name}?`);
      suggestions.push(`What are the top 5 ${catCol.name}s by total ${numCol.name}?`);
    }
    if (dateCol && numCol) {
      suggestions.push(`Show monthly trends of ${numCol.name} over time`);
      suggestions.push(`Forecast ${numCol.name} for the next 4 periods`);
    } else if (catCol) {
      suggestions.push(`Show distribution of records across ${catCol.name}`);
    }
    suggestions.push(`Run data quality and hygiene audit on ${t.table_name}`);
    if (numCol) {
      suggestions.push(`Detect anomalies and statistical outliers in ${numCol.name}`);
    } else {
      suggestions.push(`Detect anomalies in this dataset`);
    }
    setDynamicSuggestions(suggestions);
  };

  // Load selected conversation from DB
  useEffect(() => {
    if (!activeConvId) {
      fetchTables()
        .then((t) => {
          if (t && t.length > 0) {
            setTables(t);
            updateDynamicSuggestions(t);
          }
        })
        .catch(() => {});
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

        try {
          let convTables = await fetchTables(activeConvId);
          if (!convTables || convTables.length === 0) {
            convTables = await fetchTables();
          }
          if (convTables && convTables.length > 0) {
            setTables(convTables);
            updateDynamicSuggestions(convTables);
          }
        } catch {
          // keep existing tables
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

  // Handle CSV file selection / attachment (Multi-file upload support)
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const csvFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (csvFiles.length === 0) {
      setStatusNotice("Please attach valid CSV files (.csv).");
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }
    setAttachedFiles((prev) => {
      const merged = [...prev];
      csvFiles.forEach((f) => {
        if (!merged.some((m) => m.name === f.name)) {
          merged.push(f);
        }
      });
      return merged;
    });
    setStatusNotice(`Attached ${csvFiles.length} CSV file(s). Ask any question or send to profile.`);
    setTimeout(() => setStatusNotice(null), 3500);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
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

  const handleSend = async (queryText?: string) => {
    const text = (queryText !== undefined ? queryText : inputValue).trim();
    if (!text && attachedFiles.length === 0) return;
    if (loading) return;

    const currentSessionId = activeConvId || `conv-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let activeTableList = [...tables];
    let queryToSend = text;

    setLoading(true);

    // If files are attached, upload all into DuckDB scoped to this conversation!
    if (attachedFiles.length > 0) {
      const filesToUpload = [...attachedFiles];
      setAttachedFiles([]);
      setStatusNotice(`Uploading and profiling ${filesToUpload.length} CSV file(s) into DuckDB...`);

      try {
        const uploadedTables = await uploadFiles(filesToUpload, currentSessionId);
        activeTableList = uploadedTables;
        setTables(uploadedTables);
        updateDynamicSuggestions(uploadedTables);

        if (!queryToSend) {
          queryToSend = `Explain and provide an analytical overview of the uploaded dataset '${uploadedTables[0].table_name}'.`;
        }
      } catch (err: any) {
        setStatusNotice(`Upload error: ${err.message}`);
        setTimeout(() => setStatusNotice(null), 4000);
        setLoading(false);
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: queryToSend,
      timestamp: timestampStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (queryText === undefined) setInputValue("");

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const responsePayload = await sendChatMessage({
        sessionId: currentSessionId,
        message: queryToSend,
        tableNames: activeTableList.map((t) => t.table_name),
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
    setAttachedFiles([]);
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
    md += `*Generated by Digital Back Office AI Data Analyst on ${new Date().toLocaleString()}*\n\n`;
    if (tables.length > 0) {
      md += `## Analyzed Datasets\n`;
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
    link.setAttribute("download", `dbo_analysis_report_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const userName = user?.full_name || (user?.email ? user.email.split("@")[0] : "Analyst");

  return (
    <div className="h-screen flex overflow-hidden bg-[#fbfcfd] text-[#0f172a]">
      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          setStatusNotice("Profile settings updated successfully.");
          setTimeout(() => setStatusNotice(null), 2500);
        }}
      />

      {/* Dataset Table Viewer Modal */}
      <DatasetViewerModal
        isOpen={datasetViewerOpen}
        onClose={() => setDatasetViewerOpen(false)}
        tables={tables}
        onSelectPrompt={(p) => handleSend(p)}
      />

      {/* Hidden File Input with Multiple File Selection */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* LEFT SIDEBAR (Clean Light Theme #f8fafc) */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px]" : "w-0"
        } bg-[#f8fafc] border-r border-[#e2e8f0] flex flex-col transition-all duration-200 overflow-hidden shrink-0 z-20`}
      >
        {/* Top: Brand Logo */}
        <div className="p-4 border-b border-[#e2e8f0] bg-white">
          <BrandLogo size="md" showText={true} />
        </div>

        {/* Top Action: New Analysis Button */}
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#2cb8b2] hover:bg-[#eefaf9] text-xs font-semibold text-[#0f172a] transition shadow-xs group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2cb8b2] group-hover:scale-110 transition" />
              <span>New analysis</span>
            </div>
            <span className="text-[10px] text-[#94a3b8] border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </button>
        </div>

        {/* Recent Chats List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748b] flex items-center justify-between">
            <span>Recent Chats</span>
            <span className="text-[10px] font-normal text-[#94a3b8]">
              {conversations.length}
            </span>
          </div>

          {conversations.length === 0 ? (
            <p className="text-xs text-[#94a3b8] text-center mt-6 px-4 leading-relaxed">
              No saved analyses yet. Queries are saved to your database automatically.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${
                  activeConvId === conv.id
                    ? "bg-white text-[#0f172a] font-medium border border-[#e2e8f0] shadow-xs"
                    : "text-[#475569] hover:bg-white hover:text-[#0f172a]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#94a3b8] group-hover:text-[#2cb8b2] transition" />
                  <span className="truncate">{conv.title || "Untitled Analysis"}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-[#94a3b8] transition rounded"
                  title="Delete from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Profile & Settings Bar (Clean Light Footer) */}
        <div className="border-t border-[#e2e8f0] p-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#eefaf9] border border-[#b2e8e5] flex items-center justify-center text-xs font-semibold text-[#2cb8b2] shrink-0">
              <User className="w-4 h-4 text-[#2cb8b2]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#0f172a] truncate capitalize">
                {userName}
              </p>
              <p className="text-[10px] text-[#64748b] truncate">
                {user ? user.email : "Enterprise Workspace"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-lg transition"
              title="Settings & Configuration"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            {user ? (
              <button
                onClick={handleSignOut}
                className="p-1.5 text-[#64748b] hover:text-red-600 hover:bg-[#f1f5f9] rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="text-[11px] font-medium text-[#2cb8b2] hover:text-[#23a8a2] transition px-2 py-1 rounded hover:bg-[#eefaf9]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CANVAS (Light Canvas) */}
      <main className="flex-1 flex flex-col h-screen min-w-0 bg-[#fbfcfd] relative">
        {/* Top Header */}
        <header className="h-14 border-b border-[#e2e8f0] flex items-center justify-between px-4 bg-white shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#0f172a]">AI Data Analyst</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eefaf9] border border-[#b2e8e5] text-[#0f766e] font-medium">
                Digital Back Office
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {tables.length > 0 && (
              <button
                onClick={() => setDatasetViewerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#b2e8e5] bg-[#eefaf9] hover:bg-[#dff5f3] text-xs font-semibold text-[#0f766e] transition shadow-2xs"
                title="View full CSV table schema and rows"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#2cb8b2]" />
                <span>View Dataset ({tables.length})</span>
              </button>
            )}

            {messages.length > 0 && (
              <button
                onClick={exportAnalysisReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white hover:border-[#cbd5e1] text-xs font-medium text-[#334155] transition shadow-xs"
                title="Download complete report as Markdown"
              >
                <Download className="w-3.5 h-3.5 text-[#2cb8b2]" />
                <span>Export Report</span>
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white text-[#64748b] hover:text-[#0f172a] transition shadow-xs"
              title="Profile & Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Status Notification Banner */}
        {statusNotice && (
          <div className="bg-[#eefaf9] border-b border-[#b2e8e5] px-4 py-2 text-xs text-[#0f766e] flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#2cb8b2]" />
              <span>{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-[#0f766e] hover:text-[#0f172a] text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Central Chat / Message Thread Container (Expanded to eliminate empty space) */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-5xl xl:max-w-6xl mx-auto space-y-6">
            {/* Active Dataset Banner whenever tables are loaded */}
            {tables.length > 0 && (
              <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#eefaf9] border border-[#b2e8e5] text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-[#2cb8b2] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-[#0f766e]">
                      Active Dataset: {tables.map((t) => `${t.table_name}.csv`).join(", ")}
                    </span>
                    <span className="text-[#0d9488] ml-2 font-mono">
                      ({tables.reduce((acc, t) => acc + t.row_count, 0).toLocaleString()} records)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDatasetViewerOpen(true)}
                  className="font-bold text-[#2cb8b2] hover:text-[#0f766e] bg-white px-3 py-1 rounded-xl border border-[#b2e8e5] hover:bg-[#eefaf9] transition shadow-2xs shrink-0 ml-3"
                >
                  Open Table Viewer
                </button>
              </div>
            )}
            {/* If no messages: Display Personalized Greeting & Digital Back Office Welcome Card */}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center pt-6 pb-12">
                {/* Greeting pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eefaf9] border border-[#b2e8e5] text-xs font-semibold text-[#0f766e] mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#2cb8b2] animate-pulse"></span>
                  <span>{greetingText}, {userName}! 👋</span>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-[#2cb8b2] flex items-center justify-center mb-4 shadow-md text-white">
                  <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center font-bold text-lg tracking-tight">
                    DB
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-[#0f172a] mb-2 tracking-tight">
                  What would you like to analyze today?
                </h1>
                <p className="text-sm text-[#64748b] max-w-lg mb-8 leading-relaxed">
                  Upload CSV files or ask questions in natural language. Digital Back Office AI Data Analyst
                  generates deterministic SQL, interactive charts, statistical anomaly audits, and executive summaries.
                </p>

                {/* Drag & Drop Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-xl p-8 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center ${
                    isDragging
                      ? "border-[#2cb8b2] bg-[#eefaf9]"
                      : "border-[#cbd5e1] hover:border-[#2cb8b2] bg-white hover:bg-[#fbfdfd] shadow-sm"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#eefaf9] border border-[#b2e8e5] flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-[#2cb8b2]" />
                  </div>
                  <p className="text-sm font-semibold text-[#0f172a] mb-1">
                    Drag and drop your CSV file here, or <span className="text-[#2cb8b2] underline">browse</span>
                  </p>
                  <p className="text-xs text-[#64748b]">
                    You can also attach CSV files directly in the chat input below!
                  </p>
                </div>

                {/* Dynamic Suggestion Chips if a dataset is already registered */}
                {dynamicSuggestions.length > 0 && (
                  <div className="w-full max-w-xl mt-8">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b] mb-3 justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-[#2cb8b2]" />
                      <span>Suggested analytical questions for active dataset:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {dynamicSuggestions.map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(promptText)}
                          className="p-3 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#2cb8b2] hover:bg-[#eefaf9] text-xs text-[#0f172a] transition group flex items-start gap-2 shadow-xs"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#2cb8b2] shrink-0 mt-0.5" />
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
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-[#eefaf9] text-[#0f172a] text-sm leading-relaxed border border-[#b2e8e5] shadow-xs">
                        <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                        <span className="block text-[10px] text-[#0f766e] mt-1.5 text-right font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Assistant Response
                return (
                  <div key={msg.id} className="flex gap-3 text-sm text-[#0f172a]">
                    <div className="w-8 h-8 rounded-xl bg-[#2cb8b2] flex items-center justify-center shrink-0 text-white mt-0.5 shadow-sm font-bold text-xs tracking-tight">
                      DB
                    </div>

                    <div className="flex-1 space-y-4 min-w-0">
                      {/* Prominent Agent Identity Header */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0f172a]">AI Data Analyst</span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-[#eefaf9] text-[#0f766e] font-semibold border border-[#b2e8e5]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2cb8b2] animate-pulse"></span>
                          Digital Back Office Agent
                        </span>
                      </div>

                      {/* Collapsible Reasoning Process */}
                      {payload?.reasoning_steps && payload.reasoning_steps.length > 0 && (
                        <ReasoningViewer
                          steps={payload.reasoning_steps}
                          executionTimeMs={payload.execution_time_ms}
                        />
                      )}

                      {/* Natural Language Answer / Dataset Overview via MarkdownRenderer */}
                      <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                        <MarkdownRenderer content={msg.content} />
                      </div>

                      {/* Strategic Insights Cards */}
                      {payload?.insights && payload.insights.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                            Key Analytical Insights
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {payload.insights.map((insight, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-[#e2e8f0] text-xs text-[#0f172a] shadow-xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2cb8b2] shrink-0 mt-1.5"></span>
                                <span className="leading-relaxed">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Tab Navigation */}
                      {payload && (
                        <div className="rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-3 bg-[#f8fafc]">
                            <div className="flex space-x-1">
                              {payload.chart && payload.chart.type !== "none" && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [msg.id]: "chart" }))}
                                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                                    activeTab === "chart"
                                      ? "border-[#2cb8b2] text-[#2cb8b2]"
                                      : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                                  }`}
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  <span>Visual Chart</span>
                                </button>
                              )}

                              {payload.data_preview && payload.data_preview.length > 0 && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [msg.id]: "data" }))}
                                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                                    activeTab === "data" || (!payload.chart && activeTab === "findings")
                                      ? "border-[#2cb8b2] text-[#2cb8b2]"
                                      : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                                  }`}
                                >
                                  <Table className="w-3.5 h-3.5" />
                                  <span>Data Table ({payload.total_data_rows || payload.data_preview.length})</span>
                                </button>
                              )}

                              {(payload.sql_query || payload.python_code) && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [msg.id]: "sql" }))}
                                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                                    activeTab === "sql"
                                      ? "border-[#2cb8b2] text-[#2cb8b2]"
                                      : "border-transparent text-[#64748b] hover:text-[#0f172a]"
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
                                className="flex items-center gap-1 text-[11px] font-medium text-[#64748b] hover:text-[#0f172a] transition px-2 py-1 rounded"
                                title="Export results to CSV"
                              >
                                <Download className="w-3 h-3 text-[#2cb8b2]" />
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
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[#475569]">
                                        {Object.keys(payload.data_preview[0]).map((h) => (
                                          <th key={h} className="px-3.5 py-2 font-semibold">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e2e8f0]">
                                      {payload.data_preview.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-[#f8fafc]">
                                          {Object.keys(payload.data_preview[0]).map((h) => (
                                            <td key={h} className="px-3.5 py-2 text-[#334155]">
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
                                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                                        !isPandas
                                          ? "bg-[#2cb8b2] text-white shadow-xs"
                                          : "text-[#64748b] hover:text-[#0f172a] bg-[#f1f5f9]"
                                      }`}
                                    >
                                      DuckDB SQL
                                    </button>
                                    <button
                                      onClick={() => setCodeMode((p) => ({ ...p, [msg.id]: "pandas" }))}
                                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                                        isPandas
                                          ? "bg-[#2cb8b2] text-white shadow-xs"
                                          : "text-[#64748b] hover:text-[#0f172a] bg-[#f1f5f9]"
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
                                    className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#0f172a] transition px-2.5 py-1 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                                  >
                                    {copiedId === msg.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-[#2cb8b2]" />
                                        <span className="text-[#2cb8b2] font-medium">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <pre className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-mono text-[#0f172a] overflow-x-auto leading-relaxed shadow-inner">
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
              <div className="flex gap-3 text-sm text-[#0f172a]">
                <div className="w-8 h-8 rounded-xl bg-[#2cb8b2] flex items-center justify-center shrink-0 text-white font-bold text-xs">
                  DB
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#e2e8f0] flex items-center gap-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#2cb8b2] animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-[#2cb8b2] animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-[#2cb8b2] animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-[#64748b] font-medium">
                    Analyzing...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* BOTTOM FLOATING INPUT BOX WITH MULTI-CSV ATTACHMENT */}
        <div className="p-4 bg-white border-t border-[#e2e8f0] shrink-0">
          <div className="max-w-5xl xl:max-w-6xl mx-auto">
            {/* Attached CSV Files Badges */}
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={file.name + idx}
                    className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-[#eefaf9] border border-[#b2e8e5] text-xs text-[#0f766e] animate-fadeIn"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#2cb8b2] shrink-0" />
                    <span className="font-semibold">{file.name}</span>
                    <span className="text-[10px] text-[#0d9488]">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="ml-1 text-[#0f766e] hover:text-red-500 rounded p-0.5"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex items-end gap-2 bg-[#f8fafc] rounded-2xl border transition p-2 shadow-xs ${
                isDragging
                  ? "border-[#2cb8b2] bg-[#eefaf9]"
                  : "border-[#cbd5e1] focus-within:border-[#2cb8b2] focus-within:ring-1 focus-within:ring-[#2cb8b2]"
              }`}
            >
              {/* File Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-full transition shrink-0 ${
                  attachedFiles.length > 0
                    ? "bg-[#2cb8b2] text-white"
                    : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]"
                }`}
                title="Attach one or more CSV files"
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
                  attachedFiles.length > 0
                    ? `Ask about ${attachedFiles.map((f) => `'${f.name}'`).join(", ")} or press send to analyze...`
                    : tables.length > 0
                    ? `Ask anything about ${tables.map((t) => t.table_name + '.csv').join(", ")}...`
                    : "Attach CSV files or ask any data analysis question..."
                }
                rows={1}
                disabled={loading}
                className="w-full bg-transparent text-sm text-[#0f172a] placeholder-[#94a3b8] resize-none focus:outline-none py-2 px-1 max-h-[180px] disabled:opacity-50 leading-relaxed font-sans"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={loading || (!inputValue.trim() && attachedFiles.length === 0)}
                className={`p-2.5 rounded-xl transition shrink-0 ${
                  (inputValue.trim() || attachedFiles.length > 0) && !loading
                    ? "bg-[#2cb8b2] text-white hover:bg-[#23a8a2] shadow-xs"
                    : "bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed"
                }`}
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-center text-[11px] text-[#94a3b8] mt-2">
              Digital Back Office AI Data Analyst executes verified deterministic queries. History is persisted to your database.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
