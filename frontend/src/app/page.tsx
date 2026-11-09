"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TableSchema, UserProfile } from "@/types";
import { fetchTables } from "@/lib/api";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { DataPreview } from "@/components/DataPreview";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Restore session from localStorage if present
    try {
      const stored = localStorage.getItem("auth_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      // Ignore parse failure
    }

    // Check if tables are loaded on backend startup
    fetchTables()
      .then((data) => setTables(data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        tableCount={tables.length}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        {/* Left Sidebar: Data Ingestion & Schema Inspector */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4 overflow-y-auto">
          <FileUpload
            existingTables={tables}
            onTablesUpdated={(updated) => setTables(updated)}
          />
          <DataPreview tables={tables} />
        </div>

        {/* Right Area: Conversational AI Agent & Analytical Dashboard */}
        <div className="lg:col-span-8 xl:col-span-8">
          <ChatInterface tables={tables} />
        </div>
      </main>

      {/* Understated Production Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 text-xs text-zinc-500">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Engine: DuckDB In-Memory</span>
            <span>Auth: PostgreSQL</span>
            <span>LLM: OpenRouter via Server Environment</span>
          </div>

          <div className="flex items-center gap-6 text-[12px]">
            <Link href="/privacy" className="text-zinc-400 hover:text-zinc-200 transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-zinc-400 hover:text-zinc-200 transition">
              Terms of Service
            </Link>
            <span className="text-zinc-600 font-mono text-[11px]">
              Session Isolation Enabled
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
