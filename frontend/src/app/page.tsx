"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChatMessage,
  ChatResponse,
  TableSchema,
  UserProfile,
} from "@/types";
import { sendChatMessage, uploadFiles, fetchTables } from "@/lib/api";
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
  LogOut,
  Database,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

const SUGGESTIONS = [
  { label: "Regional revenue", prompt: "Which region generated the highest revenue?" },
  { label: "Monthly trends", prompt: "Show monthly sales trends." },
  { label: "Top customers", prompt: "What are the top five customers?" },
  { label: "Detect anomalies", prompt: "Detect anomalies in the dataset." },
  { label: "Underperformers", prompt: "Which products are underperforming?" },
  { label: "Generate SQL", prompt: "Generate SQL for revenue by region." },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, "findings" | "chart" | "data" | "sql">>({});
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard + data bootstrap
  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // no auth stored
    }
    fetchTables().then(setTables).catch(() => {});
  }, []);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [inputValue]);

  const createNewConversation = (): string => {
    const id = `conv-${Date.now()}`;
    const conv: Conversation = {
      id,
      title: "New analysis",
      messages: [],
      createdAt: new Date(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(id);
    return id;
  };

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputValue;
    if (!text.trim() || loading) return;

    let convId = activeConvId;
    if (!convId) {
      convId = createNewConversation();
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const updated = { ...c, messages: [...c.messages, userMsg] };
          // Set conversation title from first message
          if (c.messages.length === 0) {
            updated.title = text.length > 40 ? text.slice(0, 40) + "..." : text;
          }
          return updated;
        }
        return c;
      })
    );

    if (!queryText) setInputValue("");
    setLoading(true);

    try {
      const conv = conversations.find((c) => c.id === convId);
      const allMsgs = conv ? [...conv.messages, userMsg] : [userMsg];
      const history = allMsgs
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const responsePayload = await sendChatMessage({
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

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c
        )
      );

      if (responsePayload.chart && responsePayload.chart.type !== "none") {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "chart" }));
      } else {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "findings" }));
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Failed to process request."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, messages: [...c.messages, errorMsg] } : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const csvFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (csvFiles.length === 0) return;
    try {
      const updated = await uploadFiles(csvFiles);
      setTables(updated);
    } catch {
      // silently handle
    }
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    router.push("/login");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(id);
    setTimeout(() => setCopiedSql(null), 2000);
  };

  const exportReport = (msg: ChatMessage) => {
    if (!msg.responsePayload) return;
    const r = msg.responsePayload;
    const report = `# Analysis Report\nGenerated: ${new Date().toLocaleString()}\n\n## Summary\n${r.natural_language_answer}\n\n## Key Findings\n${r.insights.map((ins) => `- ${ins}`).join("\n")}\n\n${r.sql_query ? `## SQL Query\n\`\`\`sql\n${r.sql_query}\n\`\`\`\n` : ""}`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${Date.now()}.md`;
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
    <div className="h-screen flex overflow-hidden bg-[#212121]">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px]" : "w-0"
        } bg-[#171717] border-r border-[#2f2f2f] flex flex-col transition-all duration-200 overflow-hidden shrink-0`}
      >
        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              setActiveConvId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#383838] text-sm text-[#ececec] hover:bg-[#2f2f2f] transition"
          >
            <Plus className="w-4 h-4" />
            <span>New analysis</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-[#6b6b6b] text-center mt-8 px-4">
              No conversations yet. Start a new analysis above.
            </p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${
                activeConvId === conv.id
                  ? "bg-[#2f2f2f] text-[#ececec]"
                  : "text-[#b4b4b4] hover:bg-[#2f2f2f]/50"
              }`}
              onClick={() => setActiveConvId(conv.id)}
            >
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Datasets Section */}
        {tables.length > 0 && (
          <div className="border-t border-[#2f2f2f] px-3 py-3">
            <div className="flex items-center gap-1.5 text-xs text-[#8e8e8e] font-medium mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>{tables.length} dataset{tables.length !== 1 ? "s" : ""} loaded</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {tables.map((t) => (
                <div key={t.table_name} className="flex items-center justify-between text-xs text-[#b4b4b4] font-mono px-1">
                  <span className="truncate">{t.table_name}</span>
                  <span className="text-[#6b6b6b] shrink-0 ml-2">{t.row_count.toLocaleString()}r</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Footer */}
        <div className="border-t border-[#2f2f2f] p-3">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#2f2f2f] flex items-center justify-center text-xs font-medium text-[#ececec] shrink-0">
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <span className="text-sm text-[#b4b4b4] truncate">{user.full_name || user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#2f2f2f] transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="block w-full text-center text-sm text-[#b4b4b4] hover:text-[#ececec] py-1.5 rounded-lg hover:bg-[#2f2f2f] transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-12 flex items-center px-4 border-b border-[#2f2f2f] shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#2f2f2f] transition mr-3"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>
          <span className="text-sm font-medium text-[#ececec]">Data Analyst</span>
          {tables.length > 0 && (
            <span className="ml-2 text-xs text-[#6b6b6b] font-mono">
              {tables.length} table{tables.length !== 1 ? "s" : ""} active
            </span>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ===== WELCOME SCREEN ===== */
            <div className="h-full flex flex-col items-center justify-center px-4 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-[#2f2f2f] border border-[#383838] flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#ececec]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <ellipse cx="12" cy="6" rx="8" ry="3" />
                  <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
                  <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-[#ececec] mb-1">What would you like to analyze?</h2>
              <p className="text-sm text-[#8e8e8e] mb-8 text-center">
                Upload CSV files and ask questions about your data in plain language.
              </p>

              {/* Suggestion Grid */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.prompt}
                    onClick={() => handleSend(s.prompt)}
                    disabled={loading || tables.length === 0}
                    className="text-left p-3 rounded-xl border border-[#383838] bg-[#2f2f2f]/50 hover:bg-[#2f2f2f] text-sm text-[#b4b4b4] hover:text-[#ececec] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {tables.length === 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg border border-[#383838] text-sm text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#2f2f2f] transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload CSV files to get started</span>
                </button>
              )}
            </div>
          ) : (
            /* ===== CHAT MESSAGES ===== */
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
              {messages.map((m) => {
                const isUser = m.role === "user";
                const res = m.responsePayload;
                const currentTab = activeTabs[m.id] || "findings";

                return (
                  <div key={m.id} className="space-y-1">
                    {/* Role Label */}
                    <div className={`flex items-center gap-2 ${isUser ? "" : ""}`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-medium shrink-0 ${
                        isUser ? "bg-[#2f2f2f] text-[#ececec]" : "bg-[#2563eb] text-white"
                      }`}>
                        {isUser ? (user?.full_name || user?.email || "U")[0].toUpperCase() : "D"}
                      </div>
                      <span className="text-xs font-semibold text-[#ececec]">
                        {isUser ? "You" : "Data Analyst"}
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="pl-8">
                      {/* Reasoning Steps (collapsed by default) */}
                      {!isUser && res?.reasoning_steps && (
                        <ReasoningViewer steps={res.reasoning_steps} executionTimeMs={res.execution_time_ms} />
                      )}

                      {/* Main text */}
                      <div className="prose-chat text-[15px] leading-relaxed text-[#d1d1d1] whitespace-pre-wrap">
                        {m.content}
                      </div>

                      {/* Structured Output */}
                      {!isUser && res && (
                        <div className="mt-4 space-y-3">
                          {/* Tab bar */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1 bg-[#2f2f2f] rounded-lg p-1">
                              <button
                                onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "findings" }))}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition ${
                                  currentTab === "findings" ? "bg-[#424242] text-[#ececec]" : "text-[#8e8e8e] hover:text-[#ececec]"
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Findings
                              </button>
                              {res.chart && res.chart.type !== "none" && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "chart" }))}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition ${
                                    currentTab === "chart" ? "bg-[#424242] text-[#ececec]" : "text-[#8e8e8e] hover:text-[#ececec]"
                                  }`}
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  Chart
                                </button>
                              )}
                              {res.data_preview && res.data_preview.length > 0 && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "data" }))}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition ${
                                    currentTab === "data" ? "bg-[#424242] text-[#ececec]" : "text-[#8e8e8e] hover:text-[#ececec]"
                                  }`}
                                >
                                  <Table className="w-3.5 h-3.5" />
                                  Data ({res.total_data_rows})
                                </button>
                              )}
                              {res.sql_query && (
                                <button
                                  onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "sql" }))}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition ${
                                    currentTab === "sql" ? "bg-[#424242] text-[#ececec]" : "text-[#8e8e8e] hover:text-[#ececec]"
                                  }`}
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  SQL
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => exportReport(m)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#2f2f2f] transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Export
                            </button>
                          </div>

                          {/* Findings Tab */}
                          {currentTab === "findings" && (
                            <div className="space-y-3">
                              {res.insights && res.insights.length > 0 && (
                                <div className="p-3 bg-[#2f2f2f] rounded-lg space-y-1.5">
                                  <span className="text-xs font-semibold text-[#8e8e8e] uppercase tracking-wider">Key Findings</span>
                                  <ul className="space-y-1 text-sm text-[#d1d1d1] list-disc list-inside">
                                    {res.insights.map((ins, i) => (
                                      <li key={i}>{ins}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {res.anomalies && res.anomalies.length > 0 && (
                                <AnomalyViewer anomalies={res.anomalies} />
                              )}
                            </div>
                          )}

                          {/* Chart Tab */}
                          {currentTab === "chart" && res.chart && (
                            <ChartViewer chart={res.chart} data={res.data_preview} />
                          )}

                          {/* Data Tab */}
                          {currentTab === "data" && res.data_preview && (
                            <div className="border border-[#383838] rounded-lg overflow-x-auto max-h-64 bg-[#171717]">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#2f2f2f] text-[#8e8e8e] sticky top-0">
                                  <tr>
                                    {Object.keys(res.data_preview[0] || {}).map((col) => (
                                      <th key={col} className="px-3 py-2 whitespace-nowrap font-medium">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2f2f2f] text-[#d1d1d1]">
                                  {res.data_preview.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-[#2f2f2f]/50">
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

                          {/* SQL Tab */}
                          {currentTab === "sql" && res.sql_query && (
                            <div className="relative group bg-[#171717] border border-[#383838] rounded-lg p-3 font-mono text-xs text-[#d1d1d1] overflow-x-auto">
                              <button
                                onClick={() => copyToClipboard(res.sql_query!, m.id)}
                                className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-[#2f2f2f] hover:bg-[#424242] text-[#8e8e8e] hover:text-white transition"
                              >
                                {copiedSql === m.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <pre className="pr-8">{res.sql_query}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#2563eb] flex items-center justify-center text-xs font-medium text-white">D</div>
                    <span className="text-xs font-semibold text-[#ececec]">Data Analyst</span>
                  </div>
                  <div className="pl-8 flex items-center gap-2 text-sm text-[#8e8e8e]">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-[#8e8e8e] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>Analyzing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ===== INPUT BAR ===== */}
        <div className="p-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-2xl border border-[#383838] p-2 focus-within:border-[#555]">
              {/* File attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#8e8e8e] hover:text-[#ececec] rounded-lg hover:bg-[#424242] transition shrink-0"
                title="Attach CSV files"
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
                placeholder="Ask a question about your data..."
                disabled={loading}
                rows={1}
                className="flex-1 bg-transparent text-[15px] text-[#ececec] placeholder-[#6b6b6b] resize-none focus:outline-none py-2 px-1 max-h-[200px] disabled:opacity-50"
              />

              {/* Send button */}
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || loading}
                className="p-2 bg-[#ececec] hover:bg-white disabled:bg-[#424242] disabled:text-[#6b6b6b] text-[#212121] rounded-lg transition shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <p className="text-center text-[11px] text-[#6b6b6b] mt-2">
              Queries are executed against DuckDB in-memory tables. Results are deterministic.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
