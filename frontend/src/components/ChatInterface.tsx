"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChatMessage,
  ChatResponse,
  UserRole,
  TableSchema,
} from "@/types";
import { sendChatMessage } from "@/lib/api";
import { ReasoningViewer } from "./ReasoningViewer";
import { ChartViewer } from "./ChartViewer";
import { AnomalyViewer } from "./AnomalyViewer";
import {
  Send,
  Sparkles,
  Database,
  Code2,
  Table,
  BarChart2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface ChatInterfaceProps {
  tables: TableSchema[];
  userRole: UserRole;
  apiKey: string;
}

const EXAMPLE_QUESTIONS = [
  "Which region generated the highest revenue?",
  "Show monthly sales trends.",
  "Which products are underperforming?",
  "What are the top five customers?",
  "Detect anomalies in the dataset.",
  "Generate SQL for this analysis.",
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  tables,
  userRole,
  apiKey,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Hello! I am your AI-powered Data Analyst. Upload your CSV files or click 'Load Sample Data' on the left, then ask questions about trends, regional performance, customer rankings, or statistical anomalies.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, "answer" | "chart" | "data" | "sql">>({});
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputValue;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
        message: text,
        tableNames: tables.map((t) => t.table_name),
        userRole,
        apiKey,
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
      // Default tab: if chart is available, show 'chart', else 'answer'
      if (responsePayload.chart && responsePayload.chart.type !== "none") {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "chart" }));
      } else {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "answer" }));
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Failed to process question."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(id);
    setTimeout(() => setCopiedSql(null), 2000);
  };

  const exportReport = (msg: ChatMessage) => {
    if (!msg.responsePayload) return;
    const r = msg.responsePayload;
    const report = `# AI Data Analyst Executive Report
Generated: ${new Date().toLocaleString()}
Query: ${msg.content}

## Executive Answer
${r.natural_language_answer}

## Strategic Insights
${r.insights.map((ins) => `- ${ins}`).join("\n")}

${r.sql_query ? `## Executed DuckDB SQL\n\`\`\`sql\n${r.sql_query}\n\`\`\`\n` : ""}

## Anomalies Detected
${r.anomalies.map((a) => `- Row ${a.record_index} [${a.column_name}]: ${a.explanation}`).join("\n")}
`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-analysis-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const res = m.responsePayload;
          const currentTab = activeTabs[m.id] || "answer";

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500 font-mono">
                <span>{isUser ? "You" : "Data Analyst Agent"}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`w-full max-w-3xl rounded-2xl p-4 text-xs ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-none ml-auto"
                    : "bg-slate-950 border border-slate-800 rounded-tl-none text-slate-200"
                }`}
              >
                {/* Agent Transparent Reasoning */}
                {!isUser && res?.reasoning_steps && (
                  <ReasoningViewer
                    steps={res.reasoning_steps}
                    executionTimeMs={res.execution_time_ms}
                  />
                )}

                {/* Natural Language Answer */}
                <div className="text-sm font-sans leading-relaxed text-slate-100 whitespace-pre-wrap">
                  {m.content}
                </div>

                {/* Structured Output Tabs for Assistant Response */}
                {!isUser && res && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button
                          onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "answer" }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                            currentTab === "answer" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Insights</span>
                        </button>

                        {res.chart && res.chart.type !== "none" && (
                          <button
                            onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "chart" }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                              currentTab === "chart" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
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
                              currentTab === "data" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <Table className="w-3.5 h-3.5" />
                            <span>Data ({res.total_data_rows})</span>
                          </button>
                        )}

                        {res.sql_query && (
                          <button
                            onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "sql" }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                              currentTab === "sql" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            <span>DuckDB SQL</span>
                          </button>
                        )}
                      </div>

                      {/* Export report button */}
                      <button
                        onClick={() => exportReport(m)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-indigo-300 hover:bg-slate-900 rounded-lg transition"
                        title="Download Markdown Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Report</span>
                      </button>
                    </div>

                    {/* Tab 1: Insights & Summary */}
                    {currentTab === "answer" && (
                      <div className="space-y-3">
                        {res.insights && res.insights.length > 0 && (
                          <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-1.5">
                            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Key Business Takeaways
                            </span>
                            <ul className="space-y-1 text-slate-300 list-disc list-inside">
                              {res.insights.map((ins, i) => (
                                <li key={i} className="leading-relaxed">{ins}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Outliers Alert */}
                        {res.anomalies && res.anomalies.length > 0 && (
                          <AnomalyViewer anomalies={res.anomalies} />
                        )}
                      </div>
                    )}

                    {/* Tab 2: Interactive Chart */}
                    {currentTab === "chart" && res.chart && (
                      <ChartViewer chart={res.chart} data={res.data_preview} />
                    )}

                    {/* Tab 3: Data Table */}
                    {currentTab === "data" && res.data_preview && (
                      <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-64 bg-slate-950">
                        <table className="w-full text-left font-mono text-xs">
                          <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                            <tr>
                              {Object.keys(res.data_preview[0] || {}).map((col) => (
                                <th key={col} className="px-3 py-2 whitespace-nowrap font-medium">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {res.data_preview.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
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

                    {/* Tab 4: Generated SQL */}
                    {currentTab === "sql" && res.sql_query && (
                      <div className="relative group bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-indigo-300 overflow-x-auto">
                        <button
                          onClick={() => copyToClipboard(res.sql_query!, m.id)}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          title="Copy SQL Query"
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
          <div className="flex items-start gap-3">
            <div className="w-full max-w-xl p-4 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none">
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono">LangGraph agents coordinating: Profiling schema, generating SQL & detecting anomalies...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 overflow-x-auto flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
          Try asking:
        </span>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-full transition shrink-0 hover:border-indigo-500/40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about your datasets (e.g. 'Show monthly sales trends', 'Top 5 customers')..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

