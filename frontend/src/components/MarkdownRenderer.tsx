"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body text-sm text-[#334155] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-[#0f172a] mb-3 mt-4 pb-1 border-b border-[#e2e8f0]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-[#0f172a] mb-2.5 mt-3.5 pb-1 border-b border-[#e2e8f0]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[#0f172a] mb-2 mt-3 flex items-center gap-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-[#2cb8b2] mb-1.5 mt-2.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 text-[#334155] leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#0f172a]">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[#334155]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1 text-[#334155]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#2cb8b2] pl-3.5 py-1.5 my-3 bg-[#eefaf9] rounded-r-lg text-[#0f766e] italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#f8fafc] text-[#0f172a] border-b border-[#e2e8f0] font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#e2e8f0] text-[#334155]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#f8fafc] transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-[#0f172a] whitespace-nowrap bg-[#f8fafc]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 whitespace-nowrap text-[#334155]">{children}</td>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#0d9488] font-mono text-xs font-medium border border-[#e2e8f0]">
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 my-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] font-mono text-xs text-[#0f172a] overflow-x-auto shadow-inner">
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
