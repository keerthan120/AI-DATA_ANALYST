import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#212121] text-[#ececec] flex flex-col">
      <header className="h-12 border-b border-[#2f2f2f] px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-[#8e8e8e] hover:text-[#ececec] transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 space-y-8">
        <div className="space-y-2 border-b border-[#383838] pb-6">
          <div className="flex items-center gap-2 text-[#8e8e8e] text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </div>
          <h1 className="text-2xl font-semibold">Privacy Policy</h1>
          <p className="text-xs text-[#6b6b6b]">Last revised: November 2026</p>
        </div>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">1. Architecture</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">This platform operates on an ephemeral, in-memory analytical architecture powered by DuckDB. Uploaded datasets are held only in local application execution memory for the duration of the analytical session. Data rows are never sold, transferred to third-party networks, or indexed into training corpuses.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">2. Authentication</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">Account records (email, securely hashed passwords using salted bcrypt, and session timestamps) are stored in PostgreSQL. Passwords are never stored in plaintext. Password reset tokens expire after 1 hour.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">3. LLM Queries</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">Only schema definitions and aggregate metrics are sent to the upstream OpenRouter API. Raw dataset rows remain isolated within the local DuckDB instance.</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">4. Data Retention</h2>
          <p className="text-sm text-[#b4b4b4] leading-relaxed">Reloading the application flushes all DuckDB in-memory tables. User accounts can be purged from PostgreSQL upon request.</p>
        </section>
      </main>
    </div>
  );
}
