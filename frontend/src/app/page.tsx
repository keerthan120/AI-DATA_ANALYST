"use client";

import React, { useState, useEffect } from "react";
import { TableSchema, UserRole } from "@/types";
import { fetchTables } from "@/lib/api";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { DataPreview } from "@/components/DataPreview";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [userRole, setUserRole] = useState<UserRole>("Admin");
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    // Check if tables are already pre-loaded on backend startup
    fetchTables()
      .then((data) => setTables(data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header
        userRole={userRole}
        onRoleChange={setUserRole}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        tableCount={tables.length}
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
          <ChatInterface
            tables={tables}
            userRole={userRole}
            apiKey={apiKey}
          />
        </div>
      </main>
    </div>
  );
}
