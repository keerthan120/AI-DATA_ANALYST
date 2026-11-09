"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChatMessage,
  ChatResponse,
  TableSchema,
} from "@/types";
import { sendChatMessage } from "@/lib/api";
import { ReasoningViewer } from "./ReasoningViewer";
import { ChartViewer } from "./ChartViewer";
import { AnomalyViewer } from "./AnomalyViewer";
import {
  Send,
  Code2,
  Table,
  BarChart2,
  Copy,
  Check,
  Download,
  FileText,
} from "lucide-react";

interface ChatInterfaceProps {
  tables: TableSchema[];
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
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-msg",
      role: "assistant",
      content:
        "Data analysis session initialized. Upload one or more CSV files in the sidebar to profile schemas and execute analytical queries.",
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
      if (responsePayload.chart && responsePayload.chart.type !== "none") {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "chart" }));
      } else {
        setActiveTabs((prev) => ({ ...prev, [assistantMsg.id]: "answer" }));
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Execution Error: ${err.message || "Failed to process request."}`,
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
    const report = `# Analytical Query Report
Generated: ${new Date().toLocaleString()}
Query: ${msg.content}

## Summary
${r.natural_language_answer}

## Key Takeaways
${r.insights.map((ins) => `- ${ins}`).join("\n")}

${r.sql_query ? `## DuckDB SQL\n\`\`\`sql\n${r.sql_query}\n\`\`\`\n` : ""}

## Anomalies Detected
${r.anomalies.map((a) => `- Row ${a.record_index} [${a.column_name}]: ${a.explanation}`).join("\n")}
`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-zinc-900 border border-zinc-800 rounded-md shadow-sm overflow-hidden">
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
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-zinc-500 font-mono">
                <span>{isUser ? "Query" : "System"}</span>
                <span>/</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`w-full max-w-3xl rounded-md p-4 text-xs ${
                  isUser
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700 ml-auto"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-200"
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
                <div className="text-sm font-sans leading-relaxed text-zinc-100 whitespace-pre-wrap">
                  {m.content}
                </div>

                {/* Structured Output Tabs for Assistant Response */}
                {!isUser && res && (
                  <div className="mt-4 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1">
                        <button
                          onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "answer" }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                            currentTab === "answer" ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Findings</span>
                        </button>

                        {res.chart && res.chart.type !== "none" && (
                          <button
                            onClick={() => setActiveTabs((p) => ({ ...p, [m.id]: "chart" }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition ${
                              currentTab === "chart" ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-400 hover:text-zinc-200"
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
                              currentTab === "data" ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-400 hover:text-zinc-200"
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
                              currentTab === "sql" ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-400 hover:text-zinc-200"
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
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md border border-zinc-800 transition"
                        title="Download Markdown Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Report</span>
                      </button>
                    </div>

                    {/* Tab 1: Findings & Summary */}
                    {currentTab === "answer" && (
                      <div className="space-y-3">
                        {res.insights && res.insights.length > 0 && (
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md space-y-1.5">
                            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                              Key Findings
                            </span>
                            <ul className="space-y-1 text-zinc-300 list-disc list-inside">
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
                      <div className="border border-zinc-800 rounded-md overflow-x-auto max-h-64 bg-zinc-950">
                        <table className="w-full text-left font-mono text-xs">
                          <thead className="bg-zinc-900 text-zinc-400 sticky top-0 border-b border-zinc-800">
                            <tr>
                              {Object.keys(res.data_preview[0] || {}).map((col) => (
                                <th key={col} className="px-3 py-2 whitespace-nowrap font-medium text-zinc-300">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800 text-zinc-300">
                            {res.data_preview.map((row, idx) => (
                              <tr key={idx} className="hover:bg-zinc-900/40">
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
                      <div className="relative group bg-zinc-950 border border-zinc-800 rounded-md p-3 font-mono text-xs text-zinc-200 overflow-x-auto">
                        <button
                          onClick={() => copyToClipboard(res.sql_query!, m.id)}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition border border-zinc-800"
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
            <div className="w-full max-w-xl p-3 bg-zinc-950 border border-zinc-800 rounded-md">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono">Processing analytical workflow...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips (Rectangular, NO pill buttons) */}
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 overflow-x-auto flex items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0">
          Queries:
        </span>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-[11px] font-mono px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md transition shrink-0 hover:border-zinc-700"
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
        className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter analytical question (e.g. 'Show monthly sales trends', 'Top 5 customers')..."
          disabled={loading}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-50 font-mono"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold text-xs rounded-md flex items-center justify-center transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
